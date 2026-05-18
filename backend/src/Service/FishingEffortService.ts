import {Logger, ServiceJobAbstract} from 'figtree';
import {
    SightingFishingEffortPatch,
    SightingFishingEffortRepository
} from '../Db/MariaDb/Repositories/SightingFishingEffortRepository.js';
import {SightingFishingVesselRepository} from '../Db/MariaDb/Repositories/SightingFishingVesselRepository.js';
import {UtilIsInSea} from '../Utils/UtilIsInSea.js';
import {FishingEffortProviderRegistry} from './FishingEffort/FishingEffortProviderRegistry.js';
import {FishingEffortInfo} from './FishingEffort/Types.js';

/**
 * Per-sighting status of the fishing-effort lookup, persisted as
 * `sighting_fishing_effort.fishing_status`. The presence of
 * `fishing_last_update` is the "already processed" marker.
 *
 * 'no_provider' is the dedicated marker for "the registry has nothing
 * usable right now" (typically: GFW token absent). The row is still
 * stamped so we don't burn the cron budget retrying every 5 minutes —
 * a deploy with a token + manual `fishing_last_update = NULL` re-runs
 * the affected sightings on the next tick.
 */
type FishingStatus = 'ok' | 'land' | 'invalid_location' | 'invalid_date' | 'no_data' | 'no_provider';

/**
 * Background job that fills commercial fishing-effort context per
 * sighting from {@link FishingEffortProviderRegistry} (Global Fishing
 * Watch today). Mirrors the DepthService / WeatherService / OceanService
 * pattern but writes into the dedicated `sighting_fishing_effort`
 * table.
 *
 * Refresh threshold: ~365 days. GFW reanalysis stabilises within ~3
 * months of the sighting date, and once stable the value barely
 * changes. Force a refresh sooner by clearing `fishing_last_update`
 * in the DB.
 *
 * Provider exceptions write NO marker — the next tick retries. The
 * dedicated 'no_provider' status writes a marker that survives until
 * manually cleared (after a token is provisioned).
 */
export class FishingEffortService extends ServiceJobAbstract {

    public static readonly NAME = 'fishing-effort';

    /**
     * Sightings processed per cron tick. With up to 2 HTTP calls per
     * sighting × 1.5 s rate-limit ≈ 3 s wall time, 15 sightings = ~45 s
     * — comfortable inside the 5-minute cron window.
     * @private
     */
    private static readonly MAX_PER_RUN = 15;

    /**
     * Re-fetch fishing values older than this.
     * @private
     */
    private static readonly REFRESH_INTERVAL_MS = 365 * 24 * 60 * 60 * 1000;

    /**
     * Earliest date GFW AIS coverage is reliable enough to query.
     * Older sightings are marked invalid_date to skip them
     * permanently. Mirrors GfwProvider.EARLIEST_ISO_DATE — kept in
     * sync manually because the service should be able to drop
     * sightings before any wired provider has data.
     * @private
     */
    private static readonly EARLIEST_DATE = '2012-01-01';

    private readonly _registry: FishingEffortProviderRegistry;

    public constructor(registry?: FishingEffortProviderRegistry) {
        super(FishingEffortService.NAME, ['mariadb']);
        this._cron = '*/5 * * * *';
        this._registry = registry ?? new FishingEffortProviderRegistry();
    }

    /**
     * Build the patch. `provenance` is merged with whatever was there
     * before (only this table is touched, so other services' entries
     * are unaffected — but the table's own previous provenance still
     * needs to survive an upsert).
     * @private
     */
    private async _buildPatch(
        sightingId: number,
        status: FishingStatus,
        info: FishingEffortInfo | null
    ): Promise<SightingFishingEffortPatch> {
        const repo = SightingFishingEffortRepository.getInstance();
        const existing = await repo.findOneBySighting(sightingId);
        const provenance: Record<string, string> = {...existing?.provenance ?? {}};
        const day = info?.day;
        const provider = info?.provider;

        if (provider !== undefined && day !== undefined) {
            provenance.fishing_hours_day_25km = provider;
            provenance.fishing_hours_day_50km = provider;
            provenance.vessel_count_day_25km = provider;
            provenance.top_gear_type = provider;
            provenance.top_flag = provider;

            if (info?.dataset_version !== undefined) {
                provenance.dataset_version = info.dataset_version;
            }
        } else {
            delete provenance.fishing_hours_day_25km;
            delete provenance.fishing_hours_day_50km;
            delete provenance.vessel_count_day_25km;
            delete provenance.top_gear_type;
            delete provenance.top_flag;
            delete provenance.dataset_version;
        }

        return {
            fishing_hours_day_25km: day?.fishing_hours_day_25km ?? null,
            fishing_hours_day_50km: day?.fishing_hours_day_50km ?? null,
            vessel_count_day_25km: day?.vessel_count_day_25km ?? null,
            top_gear_type: day?.top_gear_type ?? null,
            top_flag: day?.top_flag ?? null,
            fishing_status: status,
            fishing_last_update: new Date(),
            provenance: provenance
        };
    }

    private async _writeResult(
        sightingId: number,
        status: FishingStatus,
        info: FishingEffortInfo | null
    ): Promise<void> {
        const patch = await this._buildPatch(sightingId, status, info);
        await SightingFishingEffortRepository.getInstance().upsertBySighting(sightingId, patch);

        // Per-vessel breakdown: write whenever the provider exposed
        // detail rows, even on `no_data` / `land` paths (info.vessels
        // === undefined skips the write — vs an empty array which
        // explicitly clears the table for this sighting).
        if (info?.vessels !== undefined) {
            await SightingFishingVesselRepository.getInstance().replaceBySighting(
                sightingId,
                info.vessels,
                Math.floor(Date.now() / 1000)
            );
        }
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
     * Strip the time portion off a "YYYY-MM-DD[ HH:mm:ss]" string and
     * validate against the date range any wired provider can cover.
     * @private
     */
    private _parseIsoDate(raw: string): string | null {
        const dateOnly = raw.split(' ')[0].split('T')[0];

        if (!/^\d{4}-\d{2}-\d{2}$/u.test(dateOnly)) {
            return null;
        }

        if (dateOnly < FishingEffortService.EARLIEST_DATE) {
            return null;
        }

        const today = new Date().toISOString().slice(0, 10);

        if (dateOnly > today) {
            return null;
        }

        return dateOnly;
    }

    /**
     * Cron tick.
     * @protected
     */
    protected async _execute(): Promise<void> {
        const logger = Logger.getLogger();
        const cutoff = new Date(Date.now() - FishingEffortService.REFRESH_INTERVAL_MS);
        const pending = await SightingFishingEffortRepository.getInstance().findStaleForFishing(
            cutoff,
            FishingEffortService.MAX_PER_RUN
        );

        if (pending.length === 0) {
            return;
        }

        const hasProvider = this._registry.hasEnabledProvider();

        const suffix = hasProvider ? '' : ' (no provider enabled — marking no_provider)';
        logger.info(`FishingEffortService: processing ${pending.length} sighting(s)${suffix}`);

        for (const sighting of pending) {
            if (!hasProvider) {
                // eslint-disable-next-line no-await-in-loop
                await this._writeResult(sighting.id, 'no_provider', null);
                continue;
            }

            const coords = this._parseLocation(sighting.location_begin);

            if (coords === null) {
                // eslint-disable-next-line no-await-in-loop
                await this._writeResult(sighting.id, 'invalid_location', null);
                continue;
            }

            const isoDate = this._parseIsoDate(sighting.date);

            if (isoDate === null) {
                // eslint-disable-next-line no-await-in-loop
                await this._writeResult(sighting.id, 'invalid_date', null);
                continue;
            }

            if (!UtilIsInSea.isInSea(coords.longitude, coords.latitude)) {
                // eslint-disable-next-line no-await-in-loop
                await this._writeResult(sighting.id, 'land', null);
                continue;
            }

            try {
                // eslint-disable-next-line no-await-in-loop
                const info = await this._registry.getFishingEffort(
                    coords.latitude,
                    coords.longitude,
                    isoDate
                );

                if (info === null) {
                    // eslint-disable-next-line no-await-in-loop
                    await this._writeResult(sighting.id, 'no_data', null);
                } else {
                    // eslint-disable-next-line no-await-in-loop
                    await this._writeResult(sighting.id, 'ok', info);
                }
            } catch (e) {
                logger.error(
                    `FishingEffortService: lookup failed for sighting ${sighting.id} `
                    + `(${coords.latitude},${coords.longitude}@${isoDate}): ${(e as Error).message}`
                );
            }
        }
    }

}