import {Logger, ServiceJobAbstract} from '@stefanwerfling/figtree';
import {
    SightingEnrichmentPatch,
    SightingEnrichmentRepository
} from '../Db/MariaDb/Repositories/SightingEnrichmentRepository.js';
import {SightingExtendedRepository} from '../Db/MariaDb/Repositories/SightingExtendedRepository.js';
import {EnricherRegistry} from './Enrichment/EnricherRegistry.js';
import {EnrichmentContext, EnrichmentExisting} from './Enrichment/Types.js';

/**
 * Background job that fills the `sighting_enrichment` table — astronomy,
 * extra weather, upwelling and (as they are wired) the spatial-derivative
 * and gated Tier-2/3 layers. Mirrors the OceanService / FishingEffortService
 * pattern, but:
 *
 *   - writes into the NEW `sighting_enrichment` table, keyed by the
 *     sighting's stable `unid` (the original sighting table and the older
 *     derived tables are never touched);
 *   - runs a SET of enrichers per sighting (via {@link EnricherRegistry})
 *     instead of a single provider, merging their disjoint column patches.
 *
 * A single `enrichment_last_update` drives the stale-poll. If any enricher
 * throws we still persist the successful columns but leave
 * `enrichment_last_update` unset, so the row is retried next tick (same
 * "exception ⇒ retry" contract as the sibling services); routine "no data"
 * / "disabled" outcomes are recorded in the per-domain `*_status` columns.
 */
export class EnrichmentService extends ServiceJobAbstract {

    public static readonly NAME = 'enrichment';

    /**
     * Sightings processed per cron tick. The DerivedEnricher adds several
     * upstream calls per sighting (bathymetry stencil + SST neighbours), so
     * the budget is modest to stay well inside the 5-minute window; the
     * backlog drains over successive ticks.
     * @private
     */
    private static readonly MAX_PER_RUN = 12;

    /**
     * Re-compute rows older than this. Astronomy is date-fixed and the
     * weather/derived layers are effectively stable once archived, so a
     * long refresh is fine; force sooner by clearing enrichment_last_update.
     * @private
     */
    private static readonly REFRESH_INTERVAL_MS = 180 * 24 * 60 * 60 * 1000;

    /**
     * Earliest date any wired enricher can cover (ERA5 archive start).
     * @private
     */
    private static readonly EARLIEST_DATE = '1940-01-01';

    private readonly _registry: EnricherRegistry;

    public constructor(registry?: EnricherRegistry) {
        super(EnrichmentService.NAME, ['mariadb']);
        this._cron = '*/5 * * * *';
        this._registry = registry ?? new EnricherRegistry();
    }

    /**
     * Cron tick.
     * @protected
     */
    protected async _execute(): Promise<void> {
        const logger = Logger.getLogger();
        const cutoff = new Date(Date.now() - EnrichmentService.REFRESH_INTERVAL_MS);
        const pending = await SightingEnrichmentRepository.getInstance().findStale(
            cutoff,
            EnrichmentService.MAX_PER_RUN
        );

        if (pending.length === 0) {
            return;
        }

        logger.info(`EnrichmentService: processing ${pending.length} sighting(s)`);

        for (const sighting of pending) {
            const coords = this._parseLocation(sighting.location_begin);

            if (coords === null) {
                // eslint-disable-next-line no-await-in-loop
                await this._writeSkip(sighting.unid, 'invalid_location');
                continue;
            }

            const isoDate = this._parseIsoDate(sighting.date);

            if (isoDate === null) {
                // eslint-disable-next-line no-await-in-loop
                await this._writeSkip(sighting.unid, 'invalid_date');
                continue;
            }

            // eslint-disable-next-line no-await-in-loop
            const existing = await this._loadExisting(sighting.id);

            const ctx: EnrichmentContext = {
                sightingUnid: sighting.unid,
                latitude: coords.latitude,
                longitude: coords.longitude,
                isoDate: isoDate,
                timeHHmm: EnrichmentService._cleanTime(sighting.duration_from),
                existing: existing
            };

            try {
                // eslint-disable-next-line no-await-in-loop
                const result = await this._registry.runAll(ctx);
                // eslint-disable-next-line no-await-in-loop
                await this._writeResult(sighting.unid, result.fields, result.provenance, result.anyThrew);
            } catch (e) {
                logger.error(
                    `EnrichmentService: run failed for sighting ${sighting.unid} `
                    + `(${coords.latitude},${coords.longitude}@${isoDate}): ${(e as Error).message}`
                );
            }
        }
    }

    /**
     * Load the samples the enrichers reuse from sighting_extended. Decimal
     * columns come back from TypeORM as strings — coerce to number | null.
     * @private
     */
    private async _loadExisting(sightingId: number): Promise<EnrichmentExisting> {
        const ext = await SightingExtendedRepository.getInstance().findOneBySighting(sightingId);

        if (ext === null) {
            return {sstCDay: null, windSpeedMsDay: null, windDirectionDegDay: null, depthM: null};
        }

        return {
            sstCDay: EnrichmentService._num(ext.sst_c_day),
            windSpeedMsDay: EnrichmentService._num(ext.wind_speed_m_s_day),
            windDirectionDegDay: EnrichmentService._num(ext.wind_direction_deg_day),
            depthM: EnrichmentService._num(ext.depth_m)
        };
    }

    /**
     * Persist a hard-skip row: no enrichers ran, but stamp the update so we
     * don't re-poll a permanently unusable sighting every tick.
     * @private
     */
    private async _writeSkip(sightingUnid: string, status: string): Promise<void> {
        await SightingEnrichmentRepository.getInstance().upsertBySightingUnid(sightingUnid, {
            enrichment_status: status,
            enrichment_last_update: new Date()
        });
    }

    /**
     * Persist the merged enricher output. Provenance is merged over whatever
     * was there before so a partial run doesn't drop earlier values. When an
     * enricher threw, `enrichment_last_update` is left untouched so the row
     * stays stale and is retried.
     * @private
     */
    private async _writeResult(
        sightingUnid: string,
        fields: SightingEnrichmentPatch,
        provenance: Record<string, string>,
        anyThrew: boolean
    ): Promise<void> {
        const repo = SightingEnrichmentRepository.getInstance();
        const existing = await repo.findOneBySightingUnid(sightingUnid);
        const mergedProvenance: Record<string, string> = {...existing?.provenance ?? {}, ...provenance};

        const patch: SightingEnrichmentPatch = {
            ...fields,
            enrichment_status: 'ok',
            provenance: mergedProvenance
        };

        if (!anyThrew) {
            patch.enrichment_last_update = new Date();
        }

        await repo.upsertBySightingUnid(sightingUnid, patch);
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
     * Strip any time portion off a "YYYY-MM-DD[ HH:mm:ss]" string and
     * validate against the earliest date any wired enricher covers.
     * @private
     */
    private _parseIsoDate(raw: string): string | null {
        const dateOnly = raw.split(' ')[0].split('T')[0];

        if (!/^\d{4}-\d{2}-\d{2}$/u.test(dateOnly)) {
            return null;
        }

        if (dateOnly < EnrichmentService.EARLIEST_DATE) {
            return null;
        }

        const today = new Date().toISOString().slice(0, 10);

        if (dateOnly > today) {
            return null;
        }

        return dateOnly;
    }

    /**
     * Normalise a raw time field to 'HH:mm' or null — enrichers tolerate a
     * trailing ':ss' but an empty/garbage field must become null.
     * @private
     */
    private static _cleanTime(raw: string): string | null {
        const trimmed = raw.trim();

        return /^\d{1,2}:\d{2}/u.test(trimmed) ? trimmed : null;
    }

    /**
     * Coerce a possibly-string decimal to a finite number, else null.
     * @private
     */
    private static _num(value: number | string | null): number | null {
        if (value === null) {
            return null;
        }

        const n = typeof value === 'number' ? value : Number(value);

        return Number.isFinite(n) ? n : null;
    }

}