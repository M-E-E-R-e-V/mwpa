import {Logger, ServiceJobAbstract} from 'figtree';
import {Sighting} from '../../Db/MariaDb/Entities/Sighting.js';
import {SightingCurrentField} from '../../Db/MariaDb/Entities/SightingCurrentField.js';
import {SightingCurrentFieldRepository} from '../../Db/MariaDb/Repositories/SightingCurrentFieldRepository.js';
import {SightingExtendedRepository} from '../../Db/MariaDb/Repositories/SightingExtendedRepository.js';
import {UtilIsInSea} from '../../Utils/UtilIsInSea.js';
import {CmemsRegionalPatch, CmemsWmtsClient} from './CmemsWmtsClient.js';
import {CurrentRegionAggregates} from './CurrentRegionAggregates.js';

/**
 * Background job that fills the per-sighting regional CMEMS current
 * patch ({@link SightingCurrentField}) and derives the four scalar
 * aggregates that land on {@link SightingExtended}
 * (`current_region_mean_speed_m_s_day`,
 * `current_region_max_speed_m_s_day`,
 * `current_curl_s_inv_day`,
 * `current_divergence_s_inv_day`).
 *
 * Why a separate service from {@link OceanService}?
 *   - A patch costs `nLat × nLon` upstream calls (default 9×9 = 81 GETs
 *     at 1 req/s ≈ 80 s per sighting). Folding that into OceanService
 *     would blow its 5-minute cron window and turn the polite-rate
 *     scalar enrichment into a multi-hour job.
 *   - The patch is an opt-in / lazy enrichment: many sightings will
 *     never need it, while the scalars on SightingExtended must be
 *     filled for every record.
 *   - Provider chain is single-purpose (CMEMS only), so a registry
 *     would be over-engineering for v1.
 *
 * Cadence: hourly tick, one sighting per tick (≈ 80 s of work + idle).
 * That keeps the upstream pressure ≪ 1 req/s averaged over the hour
 * and still lets a fresh-install backfill drain at one sighting per
 * hour without operator intervention — call the upcoming on-demand
 * route from the UI for ad-hoc gaps.
 */
export class CurrentFieldService extends ServiceJobAbstract {

    public static readonly NAME = 'current_field';

    /**
     * Sightings per tick. Keep at 1: a single patch already takes
     * ~80 s with the default grid; doing two would push past the
     * cron interval and stack jobs.
     * @private
     */
    private static readonly MAX_PER_RUN = 1;

    /**
     * How many days an existing patch stays fresh. Re-fetch older
     * patches so that late-reanalysis updates (forecast → analysis)
     * eventually replace operational forecast snapshots with the
     * higher-quality reanalysis values.
     * @private
     */
    private static readonly REFRESH_INTERVAL_MS = 180 * 24 * 60 * 60 * 1000;

    /**
     * Grid extent — odd numbers so the patch is symmetric about the
     * sighting position and the centre cell is well defined. 9×9 at
     * 1/8° step covers ~110 km × 110 km, comfortable for "regional
     * context" without exploding the upstream cost.
     * @private
     */
    private static readonly GRID_N_LAT = 9;
    private static readonly GRID_N_LON = 9;
    private static readonly GRID_STEP_DEG = 0.125;

    /**
     * Earliest ISO date any wired CMEMS dataset covers. The
     * MULTIYEAR (reanalysis) layer starts 1993-01; older sightings
     * get no patch.
     * @private
     */
    private static readonly EARLIEST_DATE = '1993-01-01';

    private readonly _client: CmemsWmtsClient;

    public constructor(client?: CmemsWmtsClient) {
        super(CurrentFieldService.NAME, ['mariadb']);
        this._cron = '17 * * * *';
        this._client = client ?? new CmemsWmtsClient();
    }

    /**
     * Cron tick.
     * @protected
     */
    protected async _execute(): Promise<void> {
        const logger = Logger.getLogger();
        const cutoff = new Date(Date.now() - CurrentFieldService.REFRESH_INTERVAL_MS);
        const pending = await SightingCurrentFieldRepository.getInstance().findStaleForField(
            cutoff,
            CurrentFieldService.MAX_PER_RUN,
            CurrentFieldService.EARLIEST_DATE
        );

        if (pending.length === 0) {
            return;
        }

        logger.info(`CurrentFieldService: processing ${pending.length} sighting(s)`);

        for (const sighting of pending) {
            // eslint-disable-next-line no-await-in-loop
            await this._processOne(sighting);
        }
    }

    /**
     * One-shot fill: pull the patch, compute aggregates, persist both.
     * @private
     */
    private async _processOne(sighting: Sighting): Promise<void> {
        const logger = Logger.getLogger();
        const coords = CurrentFieldService._parseLocation(sighting.location_begin);

        if (coords === null) {
            return;
        }

        const isoDate = CurrentFieldService._parseIsoDate(sighting.date);

        if (isoDate === null) {
            return;
        }

        if (!UtilIsInSea.isInSea(coords.longitude, coords.latitude)) {
            return;
        }

        let patch: CmemsRegionalPatch | null;

        try {
            patch = await this._client.fetchRegion(
                coords.latitude,
                coords.longitude,
                isoDate,
                CurrentFieldService.GRID_N_LAT,
                CurrentFieldService.GRID_N_LON,
                CurrentFieldService.GRID_STEP_DEG
            );
        } catch (e) {
            logger.error(
                `CurrentFieldService: fetch failed for sighting ${sighting.id} `
                + `(${coords.latitude},${coords.longitude}@${isoDate}): ${(e as Error).message}`
            );
            return;
        }

        if (patch === null) {
            return;
        }

        await CurrentFieldService._persist(sighting.id, patch);
    }

    /**
     * Write the patch + the four derived scalars in two repository
     * calls. The aggregates merge with the existing extended row via
     * the same upsert path the other services use, so unrelated
     * columns (depth, weather, ocean scalars) stay intact.
     * @private
     */
    private static async _persist(sightingId: number, patch: CmemsRegionalPatch): Promise<void> {
        const aggregates = CurrentRegionAggregates.compute(patch.grid);
        const fieldRow: Partial<SightingCurrentField> = {
            sighting_id: sightingId,
            bbox_west: patch.grid.grid_lon[0],
            bbox_east: patch.grid.grid_lon[patch.grid.grid_lon.length - 1],
            bbox_south: patch.grid.grid_lat[0],
            bbox_north: patch.grid.grid_lat[patch.grid.grid_lat.length - 1],
            grid_step_deg: CurrentFieldService.GRID_STEP_DEG,
            grid_n_lat: patch.grid.grid_lat.length,
            grid_n_lon: patch.grid.grid_lon.length,
            field_json: patch.grid,
            source: patch.source,
            valid_at: patch.validAt,
            fetched_at: new Date()
        };

        await SightingCurrentFieldRepository.getInstance().upsertBySighting(sightingId, fieldRow);

        const extendedRepo = SightingExtendedRepository.getInstance();
        const existing = await extendedRepo.findOneBySighting(sightingId);
        const provenance: Record<string, string> = {...existing?.provenance ?? {}};

        if (aggregates.meanSpeedMs !== null) {
            provenance.current_region_mean_speed_m_s_day = patch.source;
        }

        if (aggregates.maxSpeedMs !== null) {
            provenance.current_region_max_speed_m_s_day = patch.source;
        }

        if (aggregates.curlSinv !== null) {
            provenance.current_curl_s_inv_day = patch.source;
        }

        if (aggregates.divergenceSinv !== null) {
            provenance.current_divergence_s_inv_day = patch.source;
        }

        await extendedRepo.upsertBySighting(sightingId, {
            current_region_mean_speed_m_s_day: aggregates.meanSpeedMs,
            current_region_max_speed_m_s_day: aggregates.maxSpeedMs,
            current_curl_s_inv_day: aggregates.curlSinv,
            current_divergence_s_inv_day: aggregates.divergenceSinv,
            provenance: provenance
        });
    }

    /**
     * Read latitude/longitude from the JSON-encoded location_begin field.
     * @private
     */
    private static _parseLocation(raw: string): {latitude: number; longitude: number;} | null {
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
     * gate against the earliest CMEMS coverage + today.
     * @private
     */
    private static _parseIsoDate(raw: string): string | null {
        const dateOnly = raw.split(' ')[0].split('T')[0];

        if (!/^\d{4}-\d{2}-\d{2}$/u.test(dateOnly)) {
            return null;
        }

        if (dateOnly < CurrentFieldService.EARLIEST_DATE) {
            return null;
        }

        const today = new Date().toISOString().slice(0, 10);

        if (dateOnly > today) {
            return null;
        }

        return dateOnly;
    }

}