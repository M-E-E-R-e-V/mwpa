import {ExtractSchemaResultType, Vts} from 'vts';
import {SchemaDefaultReturn} from 'figtree-schemas';

/**
 * Schema of SpeciesProfileRequest
 * Filter for the per-species profile aggregation
 */
export const SchemaSpeciesProfileRequest = Vts.object({
    species_id: Vts.number(),
    period_from: Vts.optional(Vts.string({description: 'YYYY-MM-DD inclusive lower bound (optional)'})),
    period_to: Vts.optional(Vts.string({description: 'YYYY-MM-DD inclusive upper bound (optional)'})),
}, {
    description: 'Filter for the per-species profile aggregation',
});

/**
 * Type of schema SpeciesProfileRequest
 */
export type SpeciesProfileRequest = ExtractSchemaResultType<typeof SchemaSpeciesProfileRequest>;

/**
 * Schema of SpeciesProfileMonthly
 * Per-month sighting count (YYYY-MM bucket)
 */
export const SchemaSpeciesProfileMonthly = Vts.object({
    ym: Vts.string({description: 'YYYY-MM'}),
    count: Vts.number(),
}, {
    description: 'Per-month sighting count (YYYY-MM bucket)',
});

/**
 * Type of schema SpeciesProfileMonthly
 */
export type SpeciesProfileMonthly = ExtractSchemaResultType<typeof SchemaSpeciesProfileMonthly>;

/**
 * Schema of SpeciesProfileHourly
 * Per-hour-of-day sighting count (0–23 bucket)
 */
export const SchemaSpeciesProfileHourly = Vts.object({
    hour: Vts.number({description: '0..23 in local time of the tour'}),
    count: Vts.number(),
}, {
    description: 'Per-hour-of-day sighting count (0–23 bucket)',
});

/**
 * Type of schema SpeciesProfileHourly
 */
export type SpeciesProfileHourly = ExtractSchemaResultType<typeof SchemaSpeciesProfileHourly>;

/**
 * Schema of SpeciesProfileBucket
 * Generic histogram bucket: [min, max) plus count
 */
export const SchemaSpeciesProfileBucket = Vts.object({
    bucket_min: Vts.number({description: 'inclusive lower edge of the bucket'}),
    bucket_max: Vts.number({description: 'exclusive upper edge of the bucket'}),
    count: Vts.number(),
}, {
    description: 'Generic histogram bucket: [min, max) plus count',
});

/**
 * Type of schema SpeciesProfileBucket
 */
export type SpeciesProfileBucket = ExtractSchemaResultType<typeof SchemaSpeciesProfileBucket>;

/**
 * Schema of SpeciesProfileGroupRatios
 * Share of sightings reporting juveniles / calves / newborns
 */
export const SchemaSpeciesProfileGroupRatios = Vts.object({
    with_juveniles: Vts.number(),
    with_calves: Vts.number(),
    with_newborns: Vts.number(),
    total: Vts.number(),
}, {
    description: 'Share of sightings reporting juveniles / calves / newborns',
});

/**
 * Type of schema SpeciesProfileGroupRatios
 */
export type SpeciesProfileGroupRatios = ExtractSchemaResultType<typeof SchemaSpeciesProfileGroupRatios>;

/**
 * Schema of SpeciesProfileEnv
 * Environmental preference distributions (per-bucket counts)
 */
export const SchemaSpeciesProfileEnv = Vts.object({
    distance_coast_m: Vts.array(SchemaSpeciesProfileBucket),
    depth_m: Vts.array(SchemaSpeciesProfileBucket),
    sst_c: Vts.array(SchemaSpeciesProfileBucket),
    chl_a_mg_m3: Vts.array(SchemaSpeciesProfileBucket),
}, {
    description: 'Environmental preference distributions (per-bucket counts)',
});

/**
 * Type of schema SpeciesProfileEnv
 */
export type SpeciesProfileEnv = ExtractSchemaResultType<typeof SchemaSpeciesProfileEnv>;

/**
 * Schema of SpeciesProfileCategoryShare
 * Labelled category count for donut-style charts (behaviour, reaction)
 */
export const SchemaSpeciesProfileCategoryShare = Vts.object({
    label: Vts.string(),
    count: Vts.number(),
}, {
    description: 'Labelled category count for donut-style charts (behaviour, reaction)',
});

/**
 * Type of schema SpeciesProfileCategoryShare
 */
export type SpeciesProfileCategoryShare = ExtractSchemaResultType<typeof SchemaSpeciesProfileCategoryShare>;

/**
 * Schema of SpeciesProfileHeadingBin
 * Heading rose bin (compass octant or finer)
 */
export const SchemaSpeciesProfileHeadingBin = Vts.object({
    bin_deg: Vts.number({description: 'Center of the bin in degrees (0 = N, 90 = E, …)'}),
    label: Vts.string({description: 'N / NE / E / SE / …'}),
    count: Vts.number(),
}, {
    description: 'Heading rose bin (compass octant or finer)',
});

/**
 * Type of schema SpeciesProfileHeadingBin
 */
export type SpeciesProfileHeadingBin = ExtractSchemaResultType<typeof SchemaSpeciesProfileHeadingBin>;

/**
 * Schema of SpeciesProfileMovement
 * Derived per-species movement signature (medians + heading rose)
 */
export const SchemaSpeciesProfileMovement = Vts.object({
    n_with_movement: Vts.number({description: 'Sightings that have an associated sighting_movement row'}),
    median_avg_speed_kt: Vts.number(),
    median_max_speed_kt: Vts.number(),
    median_total_distance_m: Vts.number(),
    heading_rose: Vts.array(SchemaSpeciesProfileHeadingBin),
}, {
    description: 'Derived per-species movement signature (medians + heading rose)',
});

/**
 * Type of schema SpeciesProfileMovement
 */
export type SpeciesProfileMovement = ExtractSchemaResultType<typeof SchemaSpeciesProfileMovement>;

/**
 * Schema of SpeciesProfileHeatmapPoint
 * Sighting position for the spatial mini-heatmap
 */
export const SchemaSpeciesProfileHeatmapPoint = Vts.object({
    lon: Vts.number(),
    lat: Vts.number(),
    count: Vts.number({description: 'species_count at this sighting (used as weight)'}),
}, {
    description: 'Sighting position for the spatial mini-heatmap',
});

/**
 * Type of schema SpeciesProfileHeatmapPoint
 */
export type SpeciesProfileHeatmapPoint = ExtractSchemaResultType<typeof SchemaSpeciesProfileHeatmapPoint>;

/**
 * Schema of SpeciesProfileMonthlyEffort
 * Per-month tour effort + sightings + SPUE
 */
export const SchemaSpeciesProfileMonthlyEffort = Vts.object({
    ym: Vts.string(),
    tour_hours: Vts.number(),
    sightings: Vts.number(),
    spue: Vts.number({description: 'Sightings per tour-hour. 0 when tour_hours = 0.'}),
}, {
    description: 'Per-month tour effort + sightings + SPUE',
});

/**
 * Type of schema SpeciesProfileMonthlyEffort
 */
export type SpeciesProfileMonthlyEffort = ExtractSchemaResultType<typeof SchemaSpeciesProfileMonthlyEffort>;

/**
 * Schema of SpeciesProfileYearly
 * Per-year sighting count
 */
export const SchemaSpeciesProfileYearly = Vts.object({
    y: Vts.string({description: 'YYYY'}),
    count: Vts.number(),
}, {
    description: 'Per-year sighting count',
});

/**
 * Type of schema SpeciesProfileYearly
 */
export type SpeciesProfileYearly = ExtractSchemaResultType<typeof SchemaSpeciesProfileYearly>;

/**
 * Schema of SpeciesProfileEnvExtra
 * Additional environmental distributions (salinity, SLA, currents, waves, UV)
 */
export const SchemaSpeciesProfileEnvExtra = Vts.object({
    salinity_psu: Vts.array(SchemaSpeciesProfileBucket),
    sla_cm: Vts.array(SchemaSpeciesProfileBucket),
    current_speed_m_s: Vts.array(SchemaSpeciesProfileBucket),
    wave_height_m: Vts.array(SchemaSpeciesProfileBucket),
    uv_index: Vts.array(SchemaSpeciesProfileBucket),
}, {
    description: 'Additional environmental distributions (salinity, SLA, currents, waves, UV)',
});

/**
 * Type of schema SpeciesProfileEnvExtra
 */
export type SpeciesProfileEnvExtra = ExtractSchemaResultType<typeof SchemaSpeciesProfileEnvExtra>;

/**
 * Schema of SpeciesProfilePressure
 * Anthropogenic / environmental pressure indicators at sightings
 */
export const SchemaSpeciesProfilePressure = Vts.object({
    beaufort: Vts.array(SchemaSpeciesProfileBucket),
    other_boats: Vts.array(SchemaSpeciesProfileBucket),
    fishing_hours_25km: Vts.array(SchemaSpeciesProfileBucket),
}, {
    description: 'Anthropogenic / environmental pressure indicators at sightings',
});

/**
 * Type of schema SpeciesProfilePressure
 */
export type SpeciesProfilePressure = ExtractSchemaResultType<typeof SchemaSpeciesProfilePressure>;

/**
 * Schema of SpeciesProfile
 * Aggregated profile of a species over a (filtered) timeframe
 */
export const SchemaSpeciesProfile = Vts.object({
    species_id: Vts.number(),
    species_name: Vts.string(),
    period_from: Vts.string({description: 'Actual date range used (resolved from request or auto-extended to data range)'}),
    period_to: Vts.string(),
    n_sightings: Vts.number(),
    group_size_total: Vts.number({description: 'Sum of species_count across all sightings'}),
    group_size_p50: Vts.number({description: 'Median species_count per sighting'}),
    group_size_p95: Vts.number(),
    monthly: Vts.array(SchemaSpeciesProfileMonthly),
    hourly: Vts.array(SchemaSpeciesProfileHourly),
    group_size: Vts.array(SchemaSpeciesProfileBucket),
    group_ratios: SchemaSpeciesProfileGroupRatios,
    env: SchemaSpeciesProfileEnv,
    behaviour_mix: Vts.array(SchemaSpeciesProfileCategoryShare),
    reaction_mix: Vts.array(SchemaSpeciesProfileCategoryShare),
    movement: SchemaSpeciesProfileMovement,
    heatmap: Vts.array(SchemaSpeciesProfileHeatmapPoint),
    monthly_effort: Vts.array(SchemaSpeciesProfileMonthlyEffort),
    yearly: Vts.array(SchemaSpeciesProfileYearly),
    env_extra: SchemaSpeciesProfileEnvExtra,
    pressure: SchemaSpeciesProfilePressure,
    cooccurrence: Vts.array(SchemaSpeciesProfileCategoryShare),
}, {
    description: 'Aggregated profile of a species over a (filtered) timeframe',
});

/**
 * Type of schema SpeciesProfile
 */
export type SpeciesProfile = ExtractSchemaResultType<typeof SchemaSpeciesProfile>;

/**
 * Schema of SpeciesProfileResponse
 * Profile response wrapper
 */
export const SchemaSpeciesProfileResponse = SchemaDefaultReturn.extend({
    profile: Vts.optional(SchemaSpeciesProfile),
}, {
    description: 'Profile response wrapper',
});

/**
 * Type of schema SpeciesProfileResponse
 */
export type SpeciesProfileResponse = ExtractSchemaResultType<typeof SchemaSpeciesProfileResponse>;