import {StatusCodes} from 'figtree-schemas';
import {
    SightingEnvironmentEntry,
    SightingEnvironmentListResponse,
    SightingEnvironmentProvenance,
    SightingsFilter
} from 'mwpa_schemas';
import {SightingEnrichment} from '../../../Db/MariaDb/Entities/SightingEnrichment.js';
import {SightingExtended} from '../../../Db/MariaDb/Entities/SightingExtended.js';
import {SightingFishingEffort} from '../../../Db/MariaDb/Entities/SightingFishingEffort.js';
import {SightingEnrichmentRepository} from '../../../Db/MariaDb/Repositories/SightingEnrichmentRepository.js';
import {SightingExtendedRepository} from '../../../Db/MariaDb/Repositories/SightingExtendedRepository.js';
import {SightingFishingEffortRepository} from '../../../Db/MariaDb/Repositories/SightingFishingEffortRepository.js';
import {SightingRepository} from '../../../Db/MariaDb/Repositories/SightingRepository.js';
import {Users} from '../../../Users/Users.js';
import {List as SpeciesList} from '../Species/List.js';

/**
 * /json/sightings/environment/list handler.
 *
 * Returns the same sighting set as /json/sightings/list (same filter,
 * same org-scoping) but joined with the SightingExtended (ocean) and
 * SightingFishingEffort (GFW) per-row enrichment tables. Position is
 * denormalised to lon/lat so the frontend doesn't have to re-parse
 * `location_begin`.
 *
 * Sightings without parseable lon/lat are dropped — the only consumer
 * is the map page, where a point with no position is useless. The
 * total `count` still reflects the unfiltered DB count so the caller
 * sees how many rows were considered before the lon/lat filter.
 */
export class Environment {

    /**
     * @returns parsed [lon, lat] from a stringified GeolocationCoordinates
     * blob, or null when the blob is empty / not JSON / missing coords.
     */
    private static _parseLonLat(location: string | undefined): [number, number] | null {
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
     * Flatten the two provenance Records into the wire shape. Both
     * services merge keys into their own column's map, so co-ercing
     * them into a single array is loss-free.
     */
    private static _mergeProvenance(
        oceanProv: Record<string, string> | null,
        fishingProv: Record<string, string> | null,
        enrichmentProv: Record<string, string> | null
    ): SightingEnvironmentProvenance[] | undefined {
        const out: SightingEnvironmentProvenance[] = [];

        if (oceanProv) {
            for (const [field, source] of Object.entries(oceanProv)) {
                out.push({field: field, source: source});
            }
        }
        if (fishingProv) {
            for (const [field, source] of Object.entries(fishingProv)) {
                out.push({field: field, source: source});
            }
        }
        if (enrichmentProv) {
            for (const [field, source] of Object.entries(enrichmentProv)) {
                out.push({field: field, source: source});
            }
        }

        return out.length > 0 ? out : undefined;
    }

    /**
     * Coerce a TypeORM `decimal` column. The driver returns strings to
     * preserve precision; the wire schema demands numbers (or
     * undefined when NULL).
     */
    private static _num(value: number | string | null | undefined): number | undefined {
        if (value === null || value === undefined) {
            return undefined;
        }

        const n = typeof value === 'string' ? parseFloat(value) : value;
        return Number.isFinite(n) ? n : undefined;
    }

    /**
     * Same as {@link _num} but coerces strings that came in as empty
     * to undefined (matches the legacy "empty string = unset" convention
     * used by some of the varchar columns).
     */
    private static _str(value: string | null | undefined): string | undefined {
        if (value === null || value === undefined || value === '') {
            return undefined;
        }
        return value;
    }

    public static async getList(
        userId: number,
        isAdmin: boolean,
        filter?: SightingsFilter
    ): Promise<SightingEnvironmentListResponse> {
        const orgIds = isAdmin ? undefined : await Users.getOrganizationIds(userId);
        const {rows, count} = await SightingRepository.getInstance().findActiveList(
            {date: 'DESC', tour_start: 'DESC'},
            filter?.offset,
            filter?.limit,
            orgIds,
            {
                period_from: filter?.period_from,
                period_to: filter?.period_to,
                species_id: filter?.species_id,
                organization_id: filter?.organization_id,
                vehicle_id: filter?.vehicle_id,
                vehicle_driver_id: filter?.vehicle_driver_id,
                search: filter?.search
            }
        );

        const speciesList = await SpeciesList.getSpeciesList();
        const speciesMap = new Map<number, typeof speciesList[number]>();
        for (const species of speciesList) {
            speciesMap.set(species.id, species);
        }

        const sightingIds = rows.map((r) => r.id);
        const sightingUnids = rows.map((r) => r.unid).filter((u) => u !== '');

        const [extendedRows, fishingRows, enrichmentRows] = await Promise.all([
            SightingExtendedRepository.getInstance().findManyBySightings(sightingIds),
            SightingFishingEffortRepository.getInstance().findManyBySightings(sightingIds),
            SightingEnrichmentRepository.getInstance().findManyBySightingUnids(sightingUnids)
        ]);

        const extByS = new Map<number, SightingExtended>();
        for (const ext of extendedRows) {
            extByS.set(ext.sighting_id, ext);
        }
        const fishBys = new Map<number, SightingFishingEffort>();
        for (const f of fishingRows) {
            fishBys.set(f.sighting_id, f);
        }
        // Enrichment is keyed by the sighting's stable unid, not its id.
        const enrByUnid = new Map<string, SightingEnrichment>();
        for (const enr of enrichmentRows) {
            enrByUnid.set(enr.sighting_unid, enr);
        }

        const list: SightingEnvironmentEntry[] = [];

        for (const entry of rows) {
            const lonLat = Environment._parseLonLat(entry.location_begin);
            if (!lonLat) {
                continue;
            }

            const ext = extByS.get(entry.id);
            const fish = fishBys.get(entry.id);
            const enr = enrByUnid.get(entry.unid);

            const species = speciesMap.get(entry.species_id);
            const pointtype = species?.species_group?.name?.toLowerCase() ?? 'none';

            list.push({
                id: entry.id,
                lon: lonLat[0],
                lat: lonLat[1],
                date: entry.date,
                species_id: entry.species_id,
                species_name: species?.name,
                pointtype: pointtype,
                organization_id: entry.organization_id,

                chl_a_mg_m3_day: Environment._num(ext?.chl_a_mg_m3_day),
                salinity_psu_day: Environment._num(ext?.salinity_psu_day),
                sla_cm_day: Environment._num(ext?.sla_cm_day),
                current_speed_m_s_day: Environment._num(ext?.current_speed_m_s_day),
                current_direction_deg_day: Environment._num(ext?.current_direction_deg_day),
                current_region_mean_speed_m_s_day: Environment._num(ext?.current_region_mean_speed_m_s_day),
                current_region_max_speed_m_s_day: Environment._num(ext?.current_region_max_speed_m_s_day),
                current_curl_s_inv_day: Environment._num(ext?.current_curl_s_inv_day),
                current_divergence_s_inv_day: Environment._num(ext?.current_divergence_s_inv_day),
                current_coastal_component_m_s_day: Environment._num(ext?.current_coastal_component_m_s_day),
                sst_c_day: Environment._num(ext?.sst_c_day),
                air_temperature_c_day: Environment._num(ext?.air_temperature_c_day),
                uv_index_day: Environment._num(ext?.uv_index_day),
                wave_height_m_day: Environment._num(ext?.wave_height_m_day),
                wave_period_s_day: Environment._num(ext?.wave_period_s_day),
                wave_direction_deg_day: Environment._num(ext?.wave_direction_deg_day),
                wind_speed_m_s_day: Environment._num(ext?.wind_speed_m_s_day),
                wind_direction_deg_day: Environment._num(ext?.wind_direction_deg_day),
                wind_gusts_m_s_day: Environment._num(ext?.wind_gusts_m_s_day),
                weather_status: Environment._str(ext?.weather_status),
                depth_m: Environment._num(ext?.depth_m),
                ocean_status: Environment._str(ext?.ocean_status),

                fishing_hours_day_25km: Environment._num(fish?.fishing_hours_day_25km),
                fishing_hours_day_50km: Environment._num(fish?.fishing_hours_day_50km),
                vessel_count_day_25km: Environment._num(fish?.vessel_count_day_25km),
                top_gear_type: Environment._str(fish?.top_gear_type),
                top_flag: Environment._str(fish?.top_flag),
                fishing_status: Environment._str(fish?.fishing_status),

                moon_phase: Environment._num(enr?.moon_phase),
                moon_illumination_pct: Environment._num(enr?.moon_illumination_pct),
                sun_elevation_deg: Environment._num(enr?.sun_elevation_deg),
                sun_azimuth_deg: Environment._num(enr?.sun_azimuth_deg),
                day_length_h: Environment._num(enr?.day_length_h),
                pressure_msl_hpa_day: Environment._num(enr?.pressure_msl_hpa_day),
                cloud_cover_pct_day: Environment._num(enr?.cloud_cover_pct_day),
                visibility_m_day: Environment._num(enr?.visibility_m_day),
                precipitation_mm_day: Environment._num(enr?.precipitation_mm_day),
                upwelling_index_day: Environment._num(enr?.upwelling_index_day),
                seabed_slope_deg: Environment._num(enr?.seabed_slope_deg),
                sst_front_grad_c_km_day: Environment._num(enr?.sst_front_grad_c_km_day),
                enrichment_status: Environment._str(enr?.enrichment_status),

                provenance: Environment._mergeProvenance(
                    ext?.provenance ?? null,
                    fish?.provenance ?? null,
                    enr?.provenance ?? null
                )
            });
        }

        return {
            statusCode: StatusCodes.OK,
            count: count,
            offset: filter?.offset ?? 0,
            list: list
        };
    }

}