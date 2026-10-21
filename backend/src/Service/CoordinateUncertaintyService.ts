import {Logger, ServiceJobAbstract} from '@stefanwerfling/figtree';
import {
    SightingExtendedPatch,
    SightingExtendedRepository
} from '../Db/MariaDb/Repositories/SightingExtendedRepository.js';
import {SpeciesRepository} from '../Db/MariaDb/Repositories/SpeciesRepository.js';

/**
 * Per-sighting coordinate-uncertainty status, persisted as
 * `sighting_extended.coord_uncert_status`.
 */
type CoordUncertStatus = 'ok' | 'invalid_location' | 'no_species';

/**
 * Background job that fills the Darwin-Core `coordinateUncertaintyInMeters`
 * (`sighting_extended.coordinate_uncertainty_m`) — the required field an
 * OBIS / GBIF archive needs. Pure computation, no external source:
 *
 *   uncertainty = per-species-class default + GPS accuracy of the fix
 *
 * The class default is keyed off the genus of the sighting's species
 * (resolved by species_id → Species.name → first word). This is "Path A":
 * conservative, documented via the samplingProtocol, and publishable — not a
 * measured distance. Clear `coord_uncert_last_update` to force a recompute
 * (e.g. after tuning the table). Writes into the existing `sighting_extended`
 * table (a derived table; the raw `sighting` row is never touched).
 */
export class CoordinateUncertaintyService extends ServiceJobAbstract {

    public static readonly NAME = 'coordinate-uncertainty';

    /**
     * Sightings processed per cron tick. Pure in-memory computation, so the
     * budget is generous — only the species list is loaded (once per tick).
     * @private
     */
    private static readonly MAX_PER_RUN = 200;

    /**
     * Re-compute values older than this. The class default only changes if
     * the lookup table is edited or a sighting's species changes; a yearly
     * refresh catches both without churn.
     * @private
     */
    private static readonly REFRESH_INTERVAL_MS = 365 * 24 * 60 * 60 * 1000;

    /**
     * Fallback when the genus is unknown — an unidentified (possibly large)
     * cetacean, deliberately conservative.
     * @private
     */
    private static readonly DEFAULT_UNCERTAINTY_M = 2000;

    /**
     * Genus (lowercase) → base positional uncertainty (m). Path-A defaults
     * from the methodology review. Unknown genera fall back to
     * DEFAULT_UNCERTAINTY_M.
     * @private
     */
    private static readonly GENUS_UNCERTAINTY_M: Record<string, number> = {
        // small dolphins
        stenella: 300,
        tursiops: 300,
        delphinus: 300,
        steno: 300,
        sousa: 300,
        // medium odontocetes
        globicephala: 500,
        grampus: 500,
        pseudorca: 500,
        orcinus: 500,
        // large whales
        balaenoptera: 1500,
        physeter: 1500,
        megaptera: 1500,
        eubalaena: 1500,
        // beaked whales
        ziphius: 800,
        mesoplodon: 800,
        hyperoodon: 800,
        // sea turtles
        caretta: 100,
        chelonia: 100,
        dermochelys: 100,
        eretmochelys: 100,
        lepidochelys: 100
    };

    public constructor() {
        super(CoordinateUncertaintyService.NAME, ['mariadb']);
        this._cron = '*/5 * * * *';
    }

    /**
     * Cron tick.
     * @protected
     */
    protected async _execute(): Promise<void> {
        const logger = Logger.getLogger();
        const cutoff = new Date(Date.now() - CoordinateUncertaintyService.REFRESH_INTERVAL_MS);
        const pending = await SightingExtendedRepository.getInstance().findStaleForCoordUncert(
            cutoff,
            CoordinateUncertaintyService.MAX_PER_RUN
        );

        if (pending.length === 0) {
            return;
        }

        logger.info(`CoordinateUncertaintyService: processing ${pending.length} sighting(s)`);

        const speciesName = await CoordinateUncertaintyService._loadSpeciesNames();

        for (const sighting of pending) {
            const fix = this._parseLocation(sighting.location_begin);

            if (fix === null) {
                // eslint-disable-next-line no-await-in-loop
                await this._writeResult(sighting.id, 'invalid_location', null);
                continue;
            }

            const name = speciesName.get(sighting.species_id);

            if (name === undefined) {
                // eslint-disable-next-line no-await-in-loop
                await this._writeResult(sighting.id, 'no_species', null);
                continue;
            }

            const base = CoordinateUncertaintyService._baseForSpecies(name);
            const uncertainty = Math.round(base + fix.accuracy);

            // eslint-disable-next-line no-await-in-loop
            await this._writeResult(sighting.id, 'ok', uncertainty);
        }
    }

    /**
     * Load a species-id → scientific-name map (one query per tick).
     * @private
     */
    private static async _loadSpeciesNames(): Promise<Map<number, string>> {
        const species = await SpeciesRepository.getInstance().findAllWithGroup();
        const map = new Map<number, string>();

        for (const entry of species) {
            map.set(entry.id, entry.name);
        }

        return map;
    }

    /**
     * Base uncertainty (m) for a species, keyed off its genus (first token
     * of the scientific name). Unknown → DEFAULT_UNCERTAINTY_M.
     * @private
     */
    private static _baseForSpecies(speciesName: string): number {
        const genus = speciesName.trim().split(/\s+/u)[0].toLowerCase();

        return CoordinateUncertaintyService.GENUS_UNCERTAINTY_M[genus]
            ?? CoordinateUncertaintyService.DEFAULT_UNCERTAINTY_M;
    }

    /**
     * Parse latitude/longitude + GPS accuracy (m) from location_begin. The
     * accuracy defaults to 0 when the fix doesn't carry one.
     * @private
     */
    private _parseLocation(raw: string): {latitude: number; longitude: number; accuracy: number;} | null {
        try {
            const data = JSON.parse(raw) as {latitude?: number; longitude?: number; accuracy?: number;};
            const lat = data.latitude;
            const lon = data.longitude;

            if (typeof lat === 'number' && typeof lon === 'number' && Number.isFinite(lat) && Number.isFinite(lon)) {
                const acc = typeof data.accuracy === 'number' && Number.isFinite(data.accuracy) && data.accuracy > 0
                    ? data.accuracy
                    : 0;

                return {latitude: lat, longitude: lon, accuracy: acc};
            }
        } catch {
            // ignore — return null
        }

        return null;
    }

    /**
     * Build the patch and upsert, touching only this service's columns +
     * its provenance key.
     * @private
     */
    private async _writeResult(
        sightingId: number,
        status: CoordUncertStatus,
        uncertaintyM: number | null
    ): Promise<void> {
        const repo = SightingExtendedRepository.getInstance();
        const existing = await repo.findOneBySighting(sightingId);
        const provenance: Record<string, string> = {...existing?.provenance ?? {}};

        if (uncertaintyM === null) {
            delete provenance.coordinate_uncertainty_m;
        } else {
            provenance.coordinate_uncertainty_m = 'species_class';
        }

        const patch: SightingExtendedPatch = {
            coordinate_uncertainty_m: uncertaintyM,
            coord_uncert_status: status,
            coord_uncert_last_update: new Date(),
            provenance: provenance
        };

        await repo.upsertBySighting(sightingId, patch);
    }

}