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
    current_region_mean_speed_m_s_day: Vts.optional(Vts.number({description: 'Day-mean current speed (m/s) averaged over the regional patch around the sighting, from CMEMS. NULL when no CMEMS patch was fetched.'})),
    current_region_max_speed_m_s_day: Vts.optional(Vts.number({description: 'Day-mean of the cell-wise max current speed (m/s) inside the regional patch, from CMEMS.'})),
    current_curl_s_inv_day: Vts.optional(Vts.number({description: 'Vertical vorticity (curl = dv/dx - du/dy) in 1/s at the sighting position, derived from the regional CMEMS u/v patch. Positive = cyclonic in northern hemisphere; magnitude flags eddy activity.'})),
    current_divergence_s_inv_day: Vts.optional(Vts.number({description: 'Horizontal divergence (du/dx + dv/dy) in 1/s at the sighting position, derived from the regional CMEMS u/v patch. Negative = convergence (front).'})),
    current_coastal_component_m_s_day: Vts.optional(Vts.number({description: 'Signed cross-shore component of the current (m/s): projection of the regional patch centre u/v onto the offshore normal of the nearest coast. Positive = seaward (offshore), negative = shoreward (onshore). NULL when no coast lies within the search radius or the centre current vector is missing.'})),
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
    wind_speed_m_s_day: Vts.optional(Vts.number({description: 'Wind speed at 10 m, day mean (m/s). From WeatherService / Open-Meteo.'})),
    wind_direction_deg_day: Vts.optional(Vts.number({description: 'Wind direction at 10 m, day circular mean (degrees, 0..359, direction the wind comes FROM).'})),
    wind_gusts_m_s_day: Vts.optional(Vts.number({description: 'Wind gusts at 10 m, day peak (m/s) — the daily maximum of the hourly gusts.'})),
    weather_status: Vts.optional(Vts.string()),
    moon_phase: Vts.optional(Vts.number({description: 'Moon phase at the sighting datetime: 0 = new, 0.5 = full (fraction of the synodic cycle). From sighting_enrichment (astro).'})),
    moon_illumination_pct: Vts.optional(Vts.number({description: 'Illuminated fraction of the lunar disk (%), 0..100. From sighting_enrichment (astro).'})),
    sun_elevation_deg: Vts.optional(Vts.number({description: 'Solar elevation (degrees above horizon) at the sighting datetime. Negative = below horizon. From sighting_enrichment (astro).'})),
    sun_azimuth_deg: Vts.optional(Vts.number({description: 'Solar azimuth (degrees clockwise from true north) at the sighting datetime. From sighting_enrichment (astro).'})),
    day_length_h: Vts.optional(Vts.number({description: 'Day length (hours of sunlight) at the sighting location and date. From sighting_enrichment (astro).'})),
    pressure_msl_hpa_day: Vts.optional(Vts.number({description: 'Mean sea-level pressure, day mean (hPa). From sighting_enrichment (open_meteo).'})),
    cloud_cover_pct_day: Vts.optional(Vts.number({description: 'Total cloud cover, day mean (%), 0..100. From sighting_enrichment (open_meteo).'})),
    visibility_m_day: Vts.optional(Vts.number({description: 'Horizontal visibility, day mean (metres). From sighting_enrichment (open_meteo).'})),
    precipitation_mm_day: Vts.optional(Vts.number({description: 'Precipitation total over the sighting day (mm). From sighting_enrichment (open_meteo).'})),
    upwelling_index_day: Vts.optional(Vts.number({description: 'Bakun coastal upwelling index (m³/s per 100 m): positive = upwelling-favourable. From sighting_enrichment (ekman).'})),
    seabed_slope_deg: Vts.optional(Vts.number({description: 'Seabed slope (degrees) at the sighting, from a bathymetry stencil. From sighting_enrichment (derived).'})),
    shelf_distance_km: Vts.optional(Vts.number({description: 'Estimated distance (km) to the 200 m shelf-break isobath, from the bathymetry stencil. From sighting_enrichment (derived).'})),
    sst_front_grad_c_km_day: Vts.optional(Vts.number({description: 'SST horizontal gradient magnitude (°C per km) — thermal-front strength. From sighting_enrichment (derived).'})),
    enrichment_status: Vts.optional(Vts.string({description: 'Overall enrichment row status (\'ok\', \'invalid_location\', \'invalid_date\', …). From sighting_enrichment.'})),
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

/**
 * Schema of SightingCurrentRegionRequest
 * Request: which sighting's regional CMEMS u/v patch to load.
 */
export const SchemaSightingCurrentRegionRequest = Vts.object({
    sighting_id: Vts.number({description: 'DB id of the sighting whose regional currents patch should be returned.'}),
}, {
    description: 'Request: which sighting\'s regional CMEMS u/v patch to load.',
});

/**
 * Type of schema SightingCurrentRegionRequest
 */
export type SightingCurrentRegionRequest = ExtractSchemaResultType<typeof SchemaSightingCurrentRegionRequest>;

/**
 * Schema of SightingCurrentRegionEntry
 * Per-sighting regional CMEMS u/v patch: bbox + grid metadata + JSON-encoded {grid_lat[], grid_lon[], u[][], v[][]} payload.
 */
export const SchemaSightingCurrentRegionEntry = Vts.object({
    sighting_id: Vts.number({description: 'Owning sighting.'}),
    bbox_west: Vts.number({description: 'Westernmost longitude of the patch (degrees).'}),
    bbox_east: Vts.number({description: 'Easternmost longitude (degrees).'}),
    bbox_south: Vts.number({description: 'Southernmost latitude (degrees).'}),
    bbox_north: Vts.number({description: 'Northernmost latitude (degrees).'}),
    grid_step_deg: Vts.number({description: 'Grid step in degrees (uniform lat/lon).'}),
    grid_n_lat: Vts.number({description: 'Number of grid rows.'}),
    grid_n_lon: Vts.number({description: 'Number of grid columns.'}),
    grid_json: Vts.string({description: 'JSON-encoded {grid_lat: number[], grid_lon: number[], u: (number|null)[][], v: (number|null)[][]}. Encoded as a string in the wire format because vts does not currently support 2D arrays; payload is small (~1-2 KB at 9x9).'}),
    source: Vts.string({description: 'Provider id (e.g. cmems_wmts_glo_anfc, cmems_wmts_glo_my).'}),
    valid_at: Vts.string({description: 'Upstream timestamp the patch represents (ISO 8601, UTC).'}),
    fetched_at: Vts.string({description: 'When the patch was pulled from CMEMS (ISO 8601, UTC).'}),
}, {
    description: 'Per-sighting regional CMEMS u/v patch: bbox + grid metadata + JSON-encoded {grid_lat[], grid_lon[], u[][], v[][]} payload.',
});

/**
 * Type of schema SightingCurrentRegionEntry
 */
export type SightingCurrentRegionEntry = ExtractSchemaResultType<typeof SchemaSightingCurrentRegionEntry>;

/**
 * Schema of SightingCurrentRegionResponse
 * Response: the regional CMEMS u/v patch for a single sighting; entry is null when no patch has been fetched yet.
 */
export const SchemaSightingCurrentRegionResponse = SchemaDefaultReturn.extend({
    entry: Vts.optional(SchemaSightingCurrentRegionEntry),
}, {
    description: 'Response: the regional CMEMS u/v patch for a single sighting; entry is null when no patch has been fetched yet.',
});

/**
 * Type of schema SightingCurrentRegionResponse
 */
export type SightingCurrentRegionResponse = ExtractSchemaResultType<typeof SchemaSightingCurrentRegionResponse>;