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
    current_region_speed_m_s: Vts.array(SchemaSpeciesProfileBucket),
    current_coastal_component_m_s: Vts.array(SchemaSpeciesProfileBucket),
    wave_height_m: Vts.array(SchemaSpeciesProfileBucket),
    uv_index: Vts.array(SchemaSpeciesProfileBucket),
    wind_speed_m_s: Vts.array(SchemaSpeciesProfileBucket),
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
 * Schema of SpeciesProfileSeismic
 * Seismic-exposure summary per species — count of correlated sightings plus magnitude/distance/offset histograms
 */
export const SchemaSpeciesProfileSeismic = Vts.object({
    n_sightings_with_event: Vts.number({description: 'Distinct sightings that have at least one correlated earthquake'}),
    n_correlations: Vts.number({description: 'Total sighting × earthquake pairs'}),
    max_magnitude: Vts.number(),
    median_distance_km: Vts.number(),
    magnitude: Vts.array(SchemaSpeciesProfileBucket),
    distance_km: Vts.array(SchemaSpeciesProfileBucket),
    hours_offset: Vts.array(SchemaSpeciesProfileBucket),
}, {
    description: 'Seismic-exposure summary per species — count of correlated sightings plus magnitude/distance/offset histograms',
});

/**
 * Type of schema SpeciesProfileSeismic
 */
export type SpeciesProfileSeismic = ExtractSchemaResultType<typeof SchemaSpeciesProfileSeismic>;

/**
 * Schema of SpeciesProfileIcc
 * Intraclass correlation (ICC) of one metric across tours — the share of its variance that is between-tour rather than within-tour. High ICC = strong clustering by tour, so sightings are far from independent for that metric.
 */
export const SchemaSpeciesProfileIcc = Vts.object({
    metric_key: Vts.string({description: 'Stable metric id (e.g. \'group_size\', \'sst_c\', \'chl_a\').'}),
    label: Vts.string({description: 'Human-readable metric label.'}),
    icc: Vts.number({description: 'Intraclass correlation, 0..1. Fraction of the metric\'s variance that is between-tour. Higher = stronger tour clustering (less independence).'}),
    n_tours: Vts.number({description: 'Number of tours (groups) that contributed at least one value to this metric.'}),
    n_obs: Vts.number({description: 'Number of sightings (observations) with a value for this metric.'}),
}, {
    description: 'Intraclass correlation (ICC) of one metric across tours — the share of its variance that is between-tour rather than within-tour. High ICC = strong clustering by tour, so sightings are far from independent for that metric.',
});

/**
 * Type of schema SpeciesProfileIcc
 */
export type SpeciesProfileIcc = ExtractSchemaResultType<typeof SchemaSpeciesProfileIcc>;

/**
 * Schema of SpeciesProfileSpatialCell
 * One grid cell of the spatial analysis — centre lon/lat plus kernel density, utilisation-distribution isopleth level (2 = 50% core, 1 = 95% home range, 0 = outside) and Getis-Ord Gi* z-score.
 */
export const SchemaSpeciesProfileSpatialCell = Vts.object({
    lon: Vts.number({description: 'Cell-centre longitude (WGS84).'}),
    lat: Vts.number({description: 'Cell-centre latitude (WGS84).'}),
    density: Vts.number({description: 'Kernel probability density at the cell (surface integrates to 1).'}),
    ud_level: Vts.number({description: 'Utilisation-distribution isopleth: 2 = 50% core, 1 = 95% home range, 0 = outside.'}),
    gi_z: Vts.optional(Vts.number({description: 'Getis-Ord Gi* z-score (|z| > 1.96 ≈ significant hot/cold spot). Null when the counts have no variance.'})),
}, {
    description: 'One grid cell of the spatial analysis — centre lon/lat plus kernel density, utilisation-distribution isopleth level (2 = 50% core, 1 = 95% home range, 0 = outside) and Getis-Ord Gi* z-score.',
});

/**
 * Type of schema SpeciesProfileSpatialCell
 */
export type SpeciesProfileSpatialCell = ExtractSchemaResultType<typeof SchemaSpeciesProfileSpatialCell>;

/**
 * Schema of SpeciesProfileSpatial
 * Server-computed spatial analysis: a regular lon/lat grid over the sightings' bounding box carrying a kernel-density utilisation distribution (50%/95% isopleths) and Getis-Ord Gi* hotspot z-scores. Only meaningful cells (inside the 95% UD or near-significant Gi*) are returned. Absent when there are too few positioned sightings.
 */
export const SchemaSpeciesProfileSpatial = Vts.object({
    n_points: Vts.number({description: 'Positioned sightings that fed the estimate.'}),
    min_lon: Vts.number({description: 'Grid bounding box — min longitude.'}),
    min_lat: Vts.number({description: 'Grid bounding box — min latitude.'}),
    max_lon: Vts.number({description: 'Grid bounding box — max longitude.'}),
    max_lat: Vts.number({description: 'Grid bounding box — max latitude.'}),
    nx: Vts.number({description: 'Grid columns (longitude cells).'}),
    ny: Vts.number({description: 'Grid rows (latitude cells).'}),
    cell_lon_deg: Vts.number({description: 'Cell width in degrees longitude (for drawing the cell rectangle).'}),
    cell_lat_deg: Vts.number({description: 'Cell height in degrees latitude.'}),
    cells: Vts.array(SchemaSpeciesProfileSpatialCell),
    bandwidth_km: Vts.number({description: 'Gaussian KDE bandwidth (km, Silverman rule).'}),
}, {
    description: 'Server-computed spatial analysis: a regular lon/lat grid over the sightings\' bounding box carrying a kernel-density utilisation distribution (50%/95% isopleths) and Getis-Ord Gi* hotspot z-scores. Only meaningful cells (inside the 95% UD or near-significant Gi*) are returned. Absent when there are too few positioned sightings.',
});

/**
 * Type of schema SpeciesProfileSpatial
 */
export type SpeciesProfileSpatial = ExtractSchemaResultType<typeof SchemaSpeciesProfileSpatial>;

/**
 * Schema of SpeciesProfileResponseBin
 * One environment bin of a target-group response curve: the target species' proportion of all sightings whose environment falls in [bucket_min, bucket_max), with a Wilson 95% CI. An effort-corrected preference (background = where surveying happened).
 */
export const SchemaSpeciesProfileResponseBin = Vts.object({
    bucket_min: Vts.number({description: 'Bin lower edge (inclusive).'}),
    bucket_max: Vts.number({description: 'Bin upper edge (exclusive); equal to bucket_min for the open tail bin.'}),
    n_target: Vts.number({description: 'Target-species sightings in this bin.'}),
    n_total: Vts.number({description: 'All sightings (any species) in this bin — the background.'}),
    proportion: Vts.number({description: 'n_target / n_total — the effort-corrected preference, 0..1.'}),
    ci_lo: Vts.number({description: 'Wilson 95% CI lower bound.'}),
    ci_hi: Vts.number({description: 'Wilson 95% CI upper bound.'}),
}, {
    description: 'One environment bin of a target-group response curve: the target species\' proportion of all sightings whose environment falls in [bucket_min, bucket_max), with a Wilson 95% CI. An effort-corrected preference (background = where surveying happened).',
});

/**
 * Type of schema SpeciesProfileResponseBin
 */
export type SpeciesProfileResponseBin = ExtractSchemaResultType<typeof SchemaSpeciesProfileResponseBin>;

/**
 * Schema of SpeciesProfileEnvResponse
 * Target-group-background environmental response curves (effort-corrected preference vs raw histograms). Per covariate: the target species' proportion of all sightings per environment bin, with Wilson 95% CIs.
 */
export const SchemaSpeciesProfileEnvResponse = Vts.object({
    sst_c: Vts.array(SchemaSpeciesProfileResponseBin),
    chl_a: Vts.array(SchemaSpeciesProfileResponseBin),
    depth_m: Vts.array(SchemaSpeciesProfileResponseBin),
    distance_coast_m: Vts.array(SchemaSpeciesProfileResponseBin),
}, {
    description: 'Target-group-background environmental response curves (effort-corrected preference vs raw histograms). Per covariate: the target species\' proportion of all sightings per environment bin, with Wilson 95% CIs.',
});

/**
 * Type of schema SpeciesProfileEnvResponse
 */
export type SpeciesProfileEnvResponse = ExtractSchemaResultType<typeof SchemaSpeciesProfileEnvResponse>;

/**
 * Schema of SpeciesProfilePhenologyBin
 * One month-of-year phenology bin (aggregated across all years): sightings, tour-hours and effort-corrected SPUE.
 */
export const SchemaSpeciesProfilePhenologyBin = Vts.object({
    month: Vts.number({description: 'Calendar month, 1..12.'}),
    sightings: Vts.number({description: 'Sightings in this month-of-year, summed over all years.'}),
    tour_hours: Vts.number({description: 'Tour-hours of effort in this month-of-year, summed over all years.'}),
    spue: Vts.number({description: 'Sightings per tour-hour (0 when no effort that month).'}),
}, {
    description: 'One month-of-year phenology bin (aggregated across all years): sightings, tour-hours and effort-corrected SPUE.',
});

/**
 * Type of schema SpeciesProfilePhenologyBin
 */
export type SpeciesProfilePhenologyBin = ExtractSchemaResultType<typeof SchemaSpeciesProfilePhenologyBin>;

/**
 * Schema of SpeciesProfileTrendPoint
 * One year of the SPUE trend: observed effort-corrected rate, the fitted linear trend with 95% CI, and the year's mean climate indices (optional B4 overlay).
 */
export const SchemaSpeciesProfileTrendPoint = Vts.object({
    year: Vts.number({description: 'Calendar year.'}),
    sightings: Vts.number({description: 'Sightings in the year.'}),
    tour_hours: Vts.number({description: 'Tour-hours of effort in the year.'}),
    spue: Vts.number({description: 'Observed sightings per tour-hour.'}),
    fit: Vts.number({description: 'Fitted linear-trend SPUE at this year.'}),
    ci_lo: Vts.number({description: 'Trend mean-response 95% CI lower bound.'}),
    ci_hi: Vts.number({description: 'Trend mean-response 95% CI upper bound.'}),
    nao: Vts.optional(Vts.number({description: 'Year-mean NAO index (if available).'})),
    amo: Vts.optional(Vts.number({description: 'Year-mean AMO index (if available).'})),
    oni: Vts.optional(Vts.number({description: 'Year-mean ONI (ENSO) index (if available).'})),
}, {
    description: 'One year of the SPUE trend: observed effort-corrected rate, the fitted linear trend with 95% CI, and the year\'s mean climate indices (optional B4 overlay).',
});

/**
 * Type of schema SpeciesProfileTrendPoint
 */
export type SpeciesProfileTrendPoint = ExtractSchemaResultType<typeof SchemaSpeciesProfileTrendPoint>;

/**
 * Schema of SpeciesProfilePhenology
 * Phenology (12-month seasonal cycle, effort-corrected) + per-year SPUE trend with a linear fit, 95% CI band and mean climate indices.
 */
export const SchemaSpeciesProfilePhenology = Vts.object({
    bins: Vts.array(SchemaSpeciesProfilePhenologyBin),
    trend: Vts.array(SchemaSpeciesProfileTrendPoint),
    slope: Vts.number({description: 'Linear-trend slope (SPUE change per year).'}),
    intercept: Vts.number({description: 'Linear-trend intercept.'}),
    r2: Vts.number({description: 'Trend R².'}),
    n: Vts.number({description: 'Years used in the trend fit.'}),
}, {
    description: 'Phenology (12-month seasonal cycle, effort-corrected) + per-year SPUE trend with a linear fit, 95% CI band and mean climate indices.',
});

/**
 * Type of schema SpeciesProfilePhenology
 */
export type SpeciesProfilePhenology = ExtractSchemaResultType<typeof SchemaSpeciesProfilePhenology>;

/**
 * Schema of SpeciesProfileBehaviourLink
 * One undirected behaviour co-occurrence link: source/target are indices into the labels array, value = sightings where both behaviours were recorded together.
 */
export const SchemaSpeciesProfileBehaviourLink = Vts.object({
    source: Vts.number({description: 'Index into labels of the first behaviour.'}),
    target: Vts.number({description: 'Index into labels of the second behaviour.'}),
    value: Vts.number({description: 'Sightings where both behaviours co-occurred.'}),
}, {
    description: 'One undirected behaviour co-occurrence link: source/target are indices into the labels array, value = sightings where both behaviours were recorded together.',
});

/**
 * Type of schema SpeciesProfileBehaviourLink
 */
export type SpeciesProfileBehaviourLink = ExtractSchemaResultType<typeof SchemaSpeciesProfileBehaviourLink>;

/**
 * Schema of SpeciesProfileBehaviourCooccurrence
 * Behaviour co-occurrence network for a chord diagram: top behaviours (labels) + undirected links counting sightings where each pair was recorded together. Co-occurrence, not a transition sequence.
 */
export const SchemaSpeciesProfileBehaviourCooccurrence = Vts.object({
    labels: Vts.array(Vts.string({description: 'Behaviour node labels (top by solo frequency).'})),
    links: Vts.array(SchemaSpeciesProfileBehaviourLink),
}, {
    description: 'Behaviour co-occurrence network for a chord diagram: top behaviours (labels) + undirected links counting sightings where each pair was recorded together. Co-occurrence, not a transition sequence.',
});

/**
 * Type of schema SpeciesProfileBehaviourCooccurrence
 */
export type SpeciesProfileBehaviourCooccurrence = ExtractSchemaResultType<typeof SchemaSpeciesProfileBehaviourCooccurrence>;

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
    seismic: SchemaSpeciesProfileSeismic,
    n_unique_tours: Vts.number({description: 'Number of distinct tours (tour_fid) the sightings came from. The cluster unit for pseudo-replication: sightings on one tour share boat/crew/weather and are not independent, so n_sightings alone overstates the effective sample size.'}),
    icc: Vts.optional(Vts.array(SchemaSpeciesProfileIcc)),
    spatial: Vts.optional(SchemaSpeciesProfileSpatial),
    response: Vts.optional(SchemaSpeciesProfileEnvResponse),
    phenology: Vts.optional(SchemaSpeciesProfilePhenology),
    behaviour_cooccurrence: Vts.optional(SchemaSpeciesProfileBehaviourCooccurrence),
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