import {Logger, ServiceJobAbstract} from 'figtree';
import {Sighting} from '../Db/MariaDb/Entities/Sighting.js';
import {SightingExtendedRepository, SightingExtendedPatch} from '../Db/MariaDb/Repositories/SightingExtendedRepository.js';
import {UtilIsInSea} from '../Utils/UtilIsInSea.js';
import {BathymetryProviderRegistry} from './Bathymetry/BathymetryProviderRegistry.js';
import {DepthInfo} from './Bathymetry/Types.js';

/**
 * Per-sighting status of the depth lookup, persisted as
 * `sighting_extended.depth_status`. The presence of `depth_last_update`
 * is the "already processed" marker that gates future re-runs.
 */
type DepthStatus = 'ok' | 'land' | 'invalid_location' | 'no_data';

/**
 * Background job that fills bathymetry metadata for every sighting.
 *
 * Each cron tick picks up to MAX_PER_RUN sightings whose
 * `depth_last_update` is NULL or older than the refresh threshold,
 * runs them through {@link BathymetryProviderRegistry}, and upserts
 * the depth_* columns of `sighting_extended`. Only those columns are
 * touched — the weather_* columns and the provenance entries written
 * by WeatherService stay intact thanks to the
 * {@link SightingExtendedRepository.upsertBySighting} merge.
 *
 * Refresh threshold: ~365 days. Bathymetry barely changes; mostly
 * we just need a way to crawl new sightings and to force a re-fetch
 * by setting depth_last_update back to NULL or 0 manually.
 *
 * Provider exceptions write NO marker — the next tick retries that
 * sighting. Permanent results (land, no_data) write a marker so we
 * don't keep hitting the upstream pointlessly.
 */
export class DepthService extends ServiceJobAbstract {

    public static readonly NAME = 'depth';

    /**
     * Sightings processed per cron tick. With ~1.2 s per HTTP request
     * the upper bound on wall time is ~36 s — well inside the 5-minute
     * cron window.
     * @private
     */
    private static readonly MAX_PER_RUN = 30;

    /**
     * Re-fetch depth values older than this. Bathymetry rarely
     * changes, so a year is fine. Force a refresh sooner by clearing
     * `depth_last_update` in the DB.
     * @private
     */
    private static readonly REFRESH_INTERVAL_MS = 365 * 24 * 60 * 60 * 1000;

    private readonly _registry: BathymetryProviderRegistry;

    public constructor(registry?: BathymetryProviderRegistry) {
        super(DepthService.NAME, ['mariadb']);
        this._cron = '*/5 * * * *';
        this._registry = registry ?? new BathymetryProviderRegistry();
    }

    /**
     * Build the depth-only patch. Merges the per-column provider into
     * the existing provenance map so this service never clobbers
     * weather_* entries written by WeatherService.
     * @private
     */
    private async _buildPatch(sightingId: number, status: DepthStatus, depth: DepthInfo | null): Promise<SightingExtendedPatch> {
        const repo = SightingExtendedRepository.getInstance();
        const existing = await repo.findOneBySighting(sightingId);
        const provenance: Record<string, string> = {...existing?.provenance ?? {}};

        if (depth === null) {
            delete provenance.depth_m;
        } else {
            provenance.depth_m = depth.provider;
        }

        return {
            depth_m: depth?.depth_m ?? null,
            depth_status: status,
            depth_last_update: new Date(),
            provenance: provenance
        };
    }

    private async _writeResult(sightingId: number, status: DepthStatus, depth: DepthInfo | null): Promise<void> {
        const patch = await this._buildPatch(sightingId, status, depth);
        await SightingExtendedRepository.getInstance().upsertBySighting(sightingId, patch);
    }

    /**
     * Read latitude/longitude from the JSON-encoded location_begin field.
     * @private
     */
    private _parseLocation(raw: string): {latitude: number; longitude: number;} | null {
        try {
            const data = JSON.parse(raw) as {latitude?: number; longitude?: number;};
            const lat = data.latitude;
            const lon = data.longitude;

            if (typeof lat === 'number' && typeof lon === 'number' && Number.isFinite(lat) && Number.isFinite(lon)) {
                return {latitude: lat, longitude: lon};
            }
        } catch {
            // ignore — return null
        }

        return null;
    }

    /**
     * Cron tick.
     * @protected
     */
    protected async _execute(): Promise<void> {
        const logger = Logger.getLogger();
        const cutoff = new Date(Date.now() - DepthService.REFRESH_INTERVAL_MS);
        const pending: Sighting[] = await SightingExtendedRepository.getInstance().findStaleForDepth(
            cutoff,
            DepthService.MAX_PER_RUN
        );

        if (pending.length === 0) {
            return;
        }

        logger.info(`DepthService: processing ${pending.length} sighting(s)`);

        for (const sighting of pending) {
            const coords = this._parseLocation(sighting.location_begin);

            if (coords === null) {
                // eslint-disable-next-line no-await-in-loop
                await this._writeResult(sighting.id, 'invalid_location', null);
                continue;
            }

            if (!UtilIsInSea.isInSea(coords.longitude, coords.latitude)) {
                // eslint-disable-next-line no-await-in-loop
                await this._writeResult(sighting.id, 'land', null);
                continue;
            }

            try {
                // eslint-disable-next-line no-await-in-loop
                const depth = await this._registry.getDepth(coords.latitude, coords.longitude);

                if (depth === null) {
                    // eslint-disable-next-line no-await-in-loop
                    await this._writeResult(sighting.id, 'no_data', null);
                } else {
                    // eslint-disable-next-line no-await-in-loop
                    await this._writeResult(sighting.id, 'ok', depth);
                }
            } catch (e) {
                // No marker written — the next tick will retry this sighting.
                logger.error(
                    `DepthService: lookup failed for sighting ${sighting.id} `
                    + `(${coords.latitude},${coords.longitude}): ${(e as Error).message}`
                );
            }
        }
    }

}