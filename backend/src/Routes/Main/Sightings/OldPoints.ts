import {StatusCodes} from 'figtree-schemas';
import {
    SightingEnvironmentEntry,
    SightingEnvironmentListResponse,
    SightingsFilter
} from 'mwpa_schemas';
import {SightingEnrichment} from '../../../Db/MariaDb/Entities/SightingEnrichment.js';
import {SightingEnrichmentRepository} from '../../../Db/MariaDb/Repositories/SightingEnrichmentRepository.js';
import {SightingOldRepository} from '../../../Db/MariaDb/Repositories/SightingOldRepository.js';
import {List as SpeciesList} from '../Species/List.js';

/**
 * /json/sightings/old-points handler.
 *
 * Returns the historical hand-maintained sightings (`sighting_old`, pre-app
 * era) as map points, reusing the {@link SightingEnvironmentListResponse}
 * wire shape — only id/lon/lat/date/species are filled, plus whatever the
 * EnrichmentService has computed for the row (astronomy / extra-weather),
 * joined by the stable `unid`. The ocean/fishing metric columns stay unset:
 * old rows have no `sighting_extended` counterpart, and the map renders them
 * in a dedicated flat-styled layer that is deliberately decoupled from the
 * metric overlays.
 *
 * NOT org-scoped — old data carries no organisation and is shared history
 * (mirrors the "show old data" list, which scopes only the app table).
 * Rows without a parseable position are dropped (useless on a map).
 */
export class OldPoints {

    /**
     * Cap on how many old points one request returns. The historical table
     * holds ~12 k positioned rows; the map only needs a bounded set per view,
     * and the frontend scopes by year to stay well under this.
     * @private
     */
    private static readonly MAX_POINTS = 6000;

    /**
     * @returns parsed [lon, lat] from a stringified coordinate blob, or null
     * when empty / not JSON / missing coords.
     * @private
     */
    private static _parseLonLat(location: string | null | undefined): [number, number] | null {
        if (!location || location === '' || location === 'null') {
            return null;
        }

        try {
            const parsed = JSON.parse(location) as {longitude?: number; latitude?: number;};

            if (typeof parsed.longitude !== 'number' || typeof parsed.latitude !== 'number') {
                return null;
            }
            if (Number.isNaN(parsed.longitude) || Number.isNaN(parsed.latitude)) {
                return null;
            }

            return [parsed.longitude, parsed.latitude];
        } catch {
            return null;
        }
    }

    /**
     * Coerce a TypeORM decimal (string | null) to number | undefined.
     * @private
     */
    private static _num(value: number | string | null | undefined): number | undefined {
        if (value === null || value === undefined) {
            return undefined;
        }

        const n = typeof value === 'string' ? parseFloat(value) : value;
        return Number.isFinite(n) ? n : undefined;
    }

    public static async getList(filter?: SightingsFilter): Promise<SightingEnvironmentListResponse> {
        const limit = Math.min(filter?.limit ?? OldPoints.MAX_POINTS, OldPoints.MAX_POINTS);

        const rows = await SightingOldRepository.getInstance().findPointsInRange(
            filter?.period_from,
            filter?.period_to,
            limit
        );

        const speciesList = await SpeciesList.getSpeciesList();
        const speciesMap = new Map<number, typeof speciesList[number]>();
        for (const species of speciesList) {
            speciesMap.set(species.id, species);
        }

        const unids = rows.map((r) => r.unid).filter((u) => u !== '');
        const enrichmentRows = await SightingEnrichmentRepository.getInstance().findManyBySightingUnids(unids);
        const enrByUnid = new Map<string, SightingEnrichment>();
        for (const enr of enrichmentRows) {
            enrByUnid.set(enr.sighting_unid, enr);
        }

        const list: SightingEnvironmentEntry[] = [];

        for (const entry of rows) {
            const lonLat = OldPoints._parseLonLat(entry.location_begin);
            if (!lonLat) {
                continue;
            }

            const species = speciesMap.get(entry.species_id);
            const enr = enrByUnid.get(entry.unid);

            // Fall back to the raw hand-recorded species string when the import
            // couldn't resolve a species_id.
            const speciesName = species?.name ?? (entry.species_name_raw === '' ? undefined : entry.species_name_raw);

            list.push({
                id: entry.id,
                lon: lonLat[0],
                lat: lonLat[1],
                date: entry.date,
                species_id: entry.species_id,
                species_name: speciesName,
                pointtype: 'old',

                moon_phase: OldPoints._num(enr?.moon_phase),
                moon_illumination_pct: OldPoints._num(enr?.moon_illumination_pct),
                sun_elevation_deg: OldPoints._num(enr?.sun_elevation_deg),
                sun_azimuth_deg: OldPoints._num(enr?.sun_azimuth_deg),
                day_length_h: OldPoints._num(enr?.day_length_h),
                pressure_msl_hpa_day: OldPoints._num(enr?.pressure_msl_hpa_day),
                cloud_cover_pct_day: OldPoints._num(enr?.cloud_cover_pct_day),
                visibility_m_day: OldPoints._num(enr?.visibility_m_day),
                precipitation_mm_day: OldPoints._num(enr?.precipitation_mm_day),
                upwelling_index_day: OldPoints._num(enr?.upwelling_index_day),
                seabed_slope_deg: OldPoints._num(enr?.seabed_slope_deg),
                shelf_distance_km: OldPoints._num(enr?.shelf_distance_km),
                sst_front_grad_c_km_day: OldPoints._num(enr?.sst_front_grad_c_km_day),
                enrichment_status: enr?.enrichment_status === '' ? undefined : enr?.enrichment_status
            });
        }

        return {
            statusCode: StatusCodes.OK,
            count: list.length,
            offset: 0,
            list: list
        };
    }

}