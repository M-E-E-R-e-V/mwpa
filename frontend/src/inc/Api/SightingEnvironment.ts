import {NetFetch} from '../Net/NetFetch';
import {SightingsFilter} from './Sightings';
import {UnauthorizedError} from './Error/UnauthorizedError';
import {StatusCodes} from './Status/StatusCodes';
import {DefaultReturn} from './Types/DefaultReturn';

/**
 * One sighting + its ocean / fishing-effort enrichment columns.
 * Mirrors the server-side `SightingEnvironmentEntry` schema; types
 * stay in this client wrapper to avoid pulling the schemas package
 * into the frontend bundle.
 */
export type SightingEnvironmentProvenanceEntry = {
    field: string;
    source: string;
};

export type SightingEnvironmentEntry = {
    id: number;
    lon: number;
    lat: number;
    date?: string;
    species_id?: number;
    species_name?: string;
    pointtype?: string;
    organization_id?: number;

    chl_a_mg_m3_day?: number;
    salinity_psu_day?: number;
    sla_cm_day?: number;
    current_speed_m_s_day?: number;
    current_direction_deg_day?: number;
    current_region_mean_speed_m_s_day?: number;
    current_region_max_speed_m_s_day?: number;
    current_curl_s_inv_day?: number;
    current_divergence_s_inv_day?: number;
    current_coastal_component_m_s_day?: number;
    sst_c_day?: number;
    air_temperature_c_day?: number;
    uv_index_day?: number;
    wave_height_m_day?: number;
    wave_period_s_day?: number;
    wave_direction_deg_day?: number;
    wind_speed_m_s_day?: number;
    wind_direction_deg_day?: number;
    wind_gusts_m_s_day?: number;
    weather_status?: string;
    depth_m?: number;
    ocean_status?: string;
    coordinate_uncertainty_m?: number;

    fishing_hours_day_25km?: number;
    fishing_hours_day_50km?: number;
    vessel_count_day_25km?: number;
    top_gear_type?: string;
    top_flag?: string;
    fishing_status?: string;

    moon_phase?: number;
    moon_illumination_pct?: number;
    sun_elevation_deg?: number;
    sun_azimuth_deg?: number;
    day_length_h?: number;
    pressure_msl_hpa_day?: number;
    cloud_cover_pct_day?: number;
    visibility_m_day?: number;
    precipitation_mm_day?: number;
    upwelling_index_day?: number;
    seabed_slope_deg?: number;
    shelf_distance_km?: number;
    sst_front_grad_c_km_day?: number;
    enrichment_status?: string;

    provenance?: SightingEnvironmentProvenanceEntry[];
};

export type SightingEnvironmentListResponse = DefaultReturn & {
    offset: number;
    count: number;
    list: SightingEnvironmentEntry[];
};

/**
 * /json/sightings/environment/list client.
 */
export class SightingEnvironment {

    public static async getList(filter?: SightingsFilter): Promise<SightingEnvironmentListResponse | null> {
        const data = filter ?? {};
        const result = await NetFetch.postData('/json/sightings/environment/list', data);

        if (result && result.statusCode) {
            switch (result.statusCode) {
                case StatusCodes.OK:
                    return result as SightingEnvironmentListResponse;

                case StatusCodes.UNAUTHORIZED:
                    throw new UnauthorizedError();
            }
        }

        return null;
    }

}