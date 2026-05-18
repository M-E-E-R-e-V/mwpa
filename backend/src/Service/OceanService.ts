import {Logger, ServiceJobAbstract} from 'figtree';
import {SightingExtendedPatch, SightingExtendedRepository} from '../Db/MariaDb/Repositories/SightingExtendedRepository.js';
import {UtilIsInSea} from '../Utils/UtilIsInSea.js';
import {OceanProviderRegistry} from './Ocean/OceanProviderRegistry.js';
import {OceanInfo, OceanSample} from './Ocean/Types.js';

/**
 * Per-sighting status of the ocean lookup, persisted as
 * `sighting_extended.ocean_status`. The presence of `ocean_last_update`
 * is the "already processed" marker.
 */
type OceanStatus = 'ok' | 'land' | 'invalid_location' | 'invalid_date' | 'no_data';

/**
 * Background job that fills marine biogeochemistry + altimetric
 * sea-state metadata (chl-a, salinity, currents, …) for every
 * sighting.
 *
 * Each cron tick picks up to MAX_PER_RUN sightings whose
 * `ocean_last_update` is NULL or older than the refresh threshold,
 * runs them through {@link OceanProviderRegistry}, and upserts the
 * `*_day` ocean columns of `sighting_extended`. Only those columns
 * are touched — the depth_*, weather_*, and provenance entries
 * written by the other services stay intact thanks to the
 * {@link SightingExtendedRepository.upsertBySighting} merge.
 *
 * Refresh threshold: ~180 days. The upstream products are mostly
 * static once they're past the reprocessing lag (chl-a NRT → final
 * reanalysis, OSCAR delayed-mode), so we don't need to re-fetch them
 * frequently — but more often than depth because recent dates may
 * see meaningful updates over months. Force a refresh sooner by
 * clearing `ocean_last_update` in the DB.
 *
 * Provider exceptions write NO marker — the next tick retries that
 * sighting. Permanent results (land, invalid_date, no_data) write a
 * marker so we don't keep hitting the upstream pointlessly.
 */
export class OceanService extends ServiceJobAbstract {

    public static readonly NAME = 'ocean';

    /**
     * Sightings processed per cron tick. With up to 3 HTTP calls per
     * sighting × 1 s rate-limit ≈ 3 s wall time per sighting, 20
     * sightings = ~60 s — comfortable inside the 5-minute cron window.
     * @private
     */
    private static readonly MAX_PER_RUN = 20;

    /**
     * Re-fetch ocean values older than this.
     * @private
     */
    private static readonly REFRESH_INTERVAL_MS = 180 * 24 * 60 * 60 * 1000;

    /**
     * Earliest date any wired-in dataset can cover. OSCAR starts
     * 1992-10; older sightings get no ocean data at all and are
     * marked invalid_date so we don't keep retrying.
     * @private
     */
    private static readonly EARLIEST_DATE = '1992-10-01';

    /**
     * Value-column names (subset of OceanSample fields) — used for
     * the per-column provenance map.
     * @private
     */
    private static readonly METRIC_KEYS: (keyof OceanSample)[] = [
        'chl_a_mg_m3', 'salinity_psu', 'sla_cm',
        'current_speed_m_s', 'current_direction_deg'
    ];

    private readonly _registry: OceanProviderRegistry;

    public constructor(registry?: OceanProviderRegistry) {
        super(OceanService.NAME, ['mariadb']);
        this._cron = '*/5 * * * *';
        this._registry = registry ?? new OceanProviderRegistry();
    }

    /**
     * Build the ocean-only patch. The `_day` columns are always written
     * (NULL when no value was produced), and the provenance map is
     * merged with whatever was there before so entries written by
     * DepthService / WeatherService are never clobbered.
     * @private
     */
    private async _buildPatch(
        sightingId: number,
        status: OceanStatus,
        ocean: OceanInfo | null
    ): Promise<SightingExtendedPatch> {
        const repo = SightingExtendedRepository.getInstance();
        const existing = await repo.findOneBySighting(sightingId);
        const provenance: Record<string, string> = {...existing?.provenance ?? {}};
        const day = ocean?.day;
        const provider = ocean?.provider;

        for (const key of OceanService.METRIC_KEYS) {
            const dayCol = `${key}_day`;

            if (provider !== undefined && day?.[key] !== undefined) {
                provenance[dayCol] = provider;
            } else {
                delete provenance[dayCol];
            }
        }

        return {
            chl_a_mg_m3_day: day?.chl_a_mg_m3 ?? null,
            salinity_psu_day: day?.salinity_psu ?? null,
            sla_cm_day: day?.sla_cm ?? null,
            current_speed_m_s_day: day?.current_speed_m_s ?? null,
            current_direction_deg_day: day?.current_direction_deg ?? null,
            ocean_status: status,
            ocean_last_update: new Date(),
            provenance: provenance
        };
    }

    private async _writeResult(
        sightingId: number,
        status: OceanStatus,
        ocean: OceanInfo | null
    ): Promise<void> {
        const patch = await this._buildPatch(sightingId, status, ocean);
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
     * Strip the time portion off a "YYYY-MM-DD[ HH:mm:ss]" string and
     * validate against the date range any wired dataset can cover.
     * @private
     */
    private _parseIsoDate(raw: string): string | null {
        const dateOnly = raw.split(' ')[0].split('T')[0];

        if (!/^\d{4}-\d{2}-\d{2}$/u.test(dateOnly)) {
            return null;
        }

        if (dateOnly < OceanService.EARLIEST_DATE) {
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
        const cutoff = new Date(Date.now() - OceanService.REFRESH_INTERVAL_MS);
        const pending = await SightingExtendedRepository.getInstance().findStaleForOcean(
            cutoff,
            OceanService.MAX_PER_RUN
        );

        if (pending.length === 0) {
            return;
        }

        logger.info(`OceanService: processing ${pending.length} sighting(s)`);

        for (const sighting of pending) {
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
                const ocean = await this._registry.getOcean(
                    coords.latitude,
                    coords.longitude,
                    isoDate
                );

                if (ocean === null) {
                    // eslint-disable-next-line no-await-in-loop
                    await this._writeResult(sighting.id, 'no_data', null);
                } else {
                    // eslint-disable-next-line no-await-in-loop
                    await this._writeResult(sighting.id, 'ok', ocean);
                }
            } catch (e) {
                logger.error(
                    `OceanService: lookup failed for sighting ${sighting.id} `
                    + `(${coords.latitude},${coords.longitude}@${isoDate}): ${(e as Error).message}`
                );
            }
        }
    }

}