import {ExtractSchemaResultType, Vts} from 'vts';
import {SchemaDefaultReturn} from 'figtree-schemas';

/**
 * Schema of SightingEnvironmentProvenance
 * One field-level provenance entry: which value column was produced by which upstream provider id.
 */
export const SchemaSightingEnvironmentProvenance = Vts.object({
    field: Vts.string({description: 'Value column the provenance applies to (e.g. \'chl_a_mg_m3_day\', \'fishing_hours_day_25km\').'}),
    source: Vts.string({description: 'Provider id that produced the value (e.g. \'erddap\', \'gfw\').'}),
}, {
    description: 'One field-level provenance entry: which value column was produced by which upstream provider id.',
});

/**
 * Type of schema SightingEnvironmentProvenance
 */
export type SightingEnvironmentProvenance = ExtractSchemaResultType<typeof SchemaSightingEnvironmentProvenance>;

/**
 * Schema of SightingEnvironmentEntry
 * One sighting with its ocean + fishing-effort enrichment columns. Position is denormalized to lon/lat so the frontend doesn't have to re-parse location_begin.
 */
export const SchemaSightingEnvironmentEntry = Vts.object({
    id: Vts.number(),
    lon: Vts.number({description: 'Longitude (WGS84). Parsed from location_begin JSON server-side.'}),
    lat: Vts.number({description: 'Latitude (WGS84). Parsed from location_begin JSON server-side.'}),
    date: Vts.optional(Vts.string({description: 'Sighting date as stored (YYYY-MM-DD or similar).'})),
    species_id: Vts.optional(Vts.number()),
    species_name: Vts.optional(Vts.string()),
    pointtype: Vts.optional(Vts.string()),
    organization_id: Vts.optional(Vts.number()),
    chl_a_mg_m3_day: Vts.optional(Vts.number({description: 'Surface chlorophyll-a (mg/m³), day mean. NULL = lookup pending or no data.'})),
    salinity_psu_day: Vts.optional(Vts.number()),
    sla_cm_day: Vts.optional(Vts.number()),
    current_speed_m_s_day: Vts.optional(Vts.number()),
    current_direction_deg_day: Vts.optional(Vts.number()),
    sst_c_day: Vts.optional(Vts.number()),
    depth_m: Vts.optional(Vts.number()),
    ocean_status: Vts.optional(Vts.string()),
    fishing_hours_day_25km: Vts.optional(Vts.number()),
    fishing_hours_day_50km: Vts.optional(Vts.number()),
    vessel_count_day_25km: Vts.optional(Vts.number()),
    top_gear_type: Vts.optional(Vts.string()),
    top_flag: Vts.optional(Vts.string()),
    fishing_status: Vts.optional(Vts.string()),
    provenance: Vts.optional(Vts.array(SchemaSightingEnvironmentProvenance)),
    air_temperature_c_day: Vts.optional(Vts.number({description: '2 m air temperature, day mean (°C). From WeatherService / Open-Meteo.'})),
    uv_index_day: Vts.optional(Vts.number({description: 'UV index, day peak (around solar noon).'})),
    wave_height_m_day: Vts.optional(Vts.number({description: 'Significant wave height, day mean (m).'})),
    wave_period_s_day: Vts.optional(Vts.number()),
    wave_direction_deg_day: Vts.optional(Vts.number()),
    weather_status: Vts.optional(Vts.string()),
}, {
    description: 'One sighting with its ocean + fishing-effort enrichment columns. Position is denormalized to lon/lat so the frontend doesn\'t have to re-parse location_begin.',
});

/**
 * Type of schema SightingEnvironmentEntry
 */
export type SightingEnvironmentEntry = ExtractSchemaResultType<typeof SchemaSightingEnvironmentEntry>;

/**
 * Schema of SightingEnvironmentListResponse
 * Response of /json/sightings/environment/list — paginated sighting list with ocean + fishing enrichment columns merged in.
 */
export const SchemaSightingEnvironmentListResponse = SchemaDefaultReturn.extend({
    count: Vts.optional(Vts.number()),
    offset: Vts.optional(Vts.number()),
    list: Vts.optional(Vts.array(SchemaSightingEnvironmentEntry)),
}, {
    description: 'Response of /json/sightings/environment/list — paginated sighting list with ocean + fishing enrichment columns merged in.',
});

/**
 * Type of schema SightingEnvironmentListResponse
 */
export type SightingEnvironmentListResponse = ExtractSchemaResultType<typeof SchemaSightingEnvironmentListResponse>;