import {ExtractSchemaResultType, Vts} from 'vts';
import {SchemaDefaultReturn} from 'figtree-schemas';

/**
 * Schema of EarthquakeEntry
 * One imported earthquake event (USGS or other source)
 */
export const SchemaEarthquakeEntry = Vts.object({
    id: Vts.number(),
    source: Vts.string({description: 'Provider tag — \'usgs\' for now; future expansion: \'emsc\''}),
    source_event_id: Vts.string({description: 'Stable provider ID, e.g. USGS \'us7000xyz\' — used for upsert'}),
    event_time_ms: Vts.number({description: 'Event origin time (ms epoch, UTC)'}),
    lat: Vts.number(),
    lon: Vts.number(),
    depth_km: Vts.optional(Vts.number()),
    magnitude: Vts.number(),
    magnitude_type: Vts.string({description: '\'ml\', \'mw\', \'mb\', etc.'}),
    place: Vts.string({description: 'Free-form locality from provider, e.g. "12 km SW of Adeje, Spain"'}),
    url: Vts.string({description: 'Provider\'s detail page for the event'}),
}, {
    description: 'One imported earthquake event (USGS or other source)',
});

/**
 * Type of schema EarthquakeEntry
 */
export type EarthquakeEntry = ExtractSchemaResultType<typeof SchemaEarthquakeEntry>;

/**
 * Schema of EarthquakeFilter
 * Paginated earthquake list filter
 */
export const SchemaEarthquakeFilter = Vts.object({
    period_from: Vts.optional(Vts.string()),
    period_to: Vts.optional(Vts.string()),
    min_magnitude: Vts.optional(Vts.number()),
    limit: Vts.optional(Vts.number()),
    offset: Vts.optional(Vts.number()),
}, {
    description: 'Paginated earthquake list filter',
});

/**
 * Type of schema EarthquakeFilter
 */
export type EarthquakeFilter = ExtractSchemaResultType<typeof SchemaEarthquakeFilter>;

/**
 * Schema of EarthquakeListResponse
 * Earthquake list response
 */
export const SchemaEarthquakeListResponse = SchemaDefaultReturn.extend({
    filter: Vts.optional(SchemaEarthquakeFilter),
    count: Vts.optional(Vts.number()),
    list: Vts.optional(Vts.array(SchemaEarthquakeEntry)),
}, {
    description: 'Earthquake list response',
});

/**
 * Type of schema EarthquakeListResponse
 */
export type EarthquakeListResponse = ExtractSchemaResultType<typeof SchemaEarthquakeListResponse>;

/**
 * Schema of EarthquakeRecorrelateResponse
 * Result of a manual sighting_seismic recompute (admin)
 */
export const SchemaEarthquakeRecorrelateResponse = SchemaDefaultReturn.extend({
    events: Vts.optional(Vts.number({description: 'Earthquakes processed'})),
    correlations: Vts.optional(Vts.number({description: 'sighting_seismic rows written'})),
}, {
    description: 'Result of a manual sighting_seismic recompute (admin)',
});

/**
 * Type of schema EarthquakeRecorrelateResponse
 */
export type EarthquakeRecorrelateResponse = ExtractSchemaResultType<typeof SchemaEarthquakeRecorrelateResponse>;

/**
 * Schema of SightingSeismicEntry
 * Per-sighting correlation to a nearby earthquake
 */
export const SchemaSightingSeismicEntry = Vts.object({
    id: Vts.number(),
    sighting_id: Vts.number(),
    earthquake_id: Vts.number(),
    distance_km: Vts.number(),
    hours_offset: Vts.number({description: 'Hours between earthquake event_time and sighting tour_start (signed: positive = earthquake before sighting)'}),
    magnitude: Vts.number({description: 'Snapshot of earthquake.magnitude at correlation time (denormalised for fast lookups)'}),
}, {
    description: 'Per-sighting correlation to a nearby earthquake',
});

/**
 * Type of schema SightingSeismicEntry
 */
export type SightingSeismicEntry = ExtractSchemaResultType<typeof SchemaSightingSeismicEntry>;

/**
 * Schema of EarthquakeImpactRequest
 * Request shape for the impact-analysis endpoint — either pin an earthquake_id (from the table) or a date (all events that day); window_days picks the ±N-day correlation slice (1/3/7/14)
 */
export const SchemaEarthquakeImpactRequest = Vts.object({
    earthquake_id: Vts.optional(Vts.number()),
    date: Vts.optional(Vts.string({description: 'YYYY-MM-DD UTC; used when earthquake_id is not set — all earthquakes on that day are aggregated'})),
    window_days: Vts.number({description: '±N-day slice of the stored ±14d correlations — UI exposes 1 / 3 / 7 / 14'}),
    earthquake_ids: Vts.optional(Vts.array(Vts.number({description: 'Set of earthquake_ids — used when the user has filtered the events list and wants the impact across all of them. Wins over earthquake_id and date when supplied.'}))),
}, {
    description: 'Request shape for the impact-analysis endpoint — either pin an earthquake_id (from the table) or a date (all events that day); window_days picks the ±N-day correlation slice (1/3/7/14)',
});

/**
 * Type of schema EarthquakeImpactRequest
 */
export type EarthquakeImpactRequest = ExtractSchemaResultType<typeof SchemaEarthquakeImpactRequest>;

/**
 * Schema of EarthquakeImpactBucket
 * One bucket label + count, reused across all 4 analytics histograms
 */
export const SchemaEarthquakeImpactBucket = Vts.object({
    key: Vts.string(),
    count: Vts.number(),
}, {
    description: 'One bucket label + count, reused across all 4 analytics histograms',
});

/**
 * Type of schema EarthquakeImpactBucket
 */
export type EarthquakeImpactBucket = ExtractSchemaResultType<typeof SchemaEarthquakeImpactBucket>;

/**
 * Schema of EarthquakeImpactSighting
 * One affected sighting × earthquake row — enriched with species/behaviour/encounter names so the frontend can render directly
 */
export const SchemaEarthquakeImpactSighting = Vts.object({
    id: Vts.number(),
    earthquake_id: Vts.number(),
    date: Vts.string(),
    tour_start: Vts.string(),
    lat: Vts.number(),
    lon: Vts.number(),
    species_id: Vts.number(),
    species_name: Vts.string(),
    behaviour_label: Vts.string({description: 'Comma-separated behaviour-state names resolved from sighting.behaviours (which stores comma-separated IDs)'}),
    encounter_id: Vts.number(),
    encounter_name: Vts.string(),
    distance_km: Vts.number(),
    hours_offset: Vts.number({description: 'Signed hours: positive = earthquake before sighting'}),
    magnitude: Vts.number(),
}, {
    description: 'One affected sighting × earthquake row — enriched with species/behaviour/encounter names so the frontend can render directly',
});

/**
 * Type of schema EarthquakeImpactSighting
 */
export type EarthquakeImpactSighting = ExtractSchemaResultType<typeof SchemaEarthquakeImpactSighting>;

/**
 * Schema of EarthquakeImpactTrackSegment
 * One movement-track polyline segment — shape mirrors what the frontend MovementTracksLayer.setMovements() expects
 */
export const SchemaEarthquakeImpactTrackSegment = Vts.object({
    start_lat: Vts.number(),
    start_lon: Vts.number(),
    end_lat: Vts.number(),
    end_lon: Vts.number(),
    quality: Vts.string({description: '"good" or "bad" — MovementTracksLayer renders bad segments dashed'}),
}, {
    description: 'One movement-track polyline segment — shape mirrors what the frontend MovementTracksLayer.setMovements() expects',
});

/**
 * Type of schema EarthquakeImpactTrackSegment
 */
export type EarthquakeImpactTrackSegment = ExtractSchemaResultType<typeof SchemaEarthquakeImpactTrackSegment>;

/**
 * Schema of EarthquakeImpactTrack
 * Movement tracks for one affected sighting (zero or more good/bad segments)
 */
export const SchemaEarthquakeImpactTrack = Vts.object({
    sighting_id: Vts.number(),
    tracks: Vts.array(SchemaEarthquakeImpactTrackSegment),
}, {
    description: 'Movement tracks for one affected sighting (zero or more good/bad segments)',
});

/**
 * Type of schema EarthquakeImpactTrack
 */
export type EarthquakeImpactTrack = ExtractSchemaResultType<typeof SchemaEarthquakeImpactTrack>;

/**
 * Schema of EarthquakeImpactAnalytics
 * Aggregated analytics for the Auswertung card — by species / behaviour / encounter / signed hours-offset
 */
export const SchemaEarthquakeImpactAnalytics = Vts.object({
    by_species: Vts.array(SchemaEarthquakeImpactBucket),
    by_behaviour: Vts.array(SchemaEarthquakeImpactBucket),
    by_encounter: Vts.array(SchemaEarthquakeImpactBucket),
    hours_offset_hist: Vts.array(SchemaEarthquakeImpactBucket),
}, {
    description: 'Aggregated analytics for the Auswertung card — by species / behaviour / encounter / signed hours-offset',
});

/**
 * Type of schema EarthquakeImpactAnalytics
 */
export type EarthquakeImpactAnalytics = ExtractSchemaResultType<typeof SchemaEarthquakeImpactAnalytics>;

/**
 * Schema of EarthquakeImpactResponse
 * Result of /json/earthquake/impact — focus earthquakes + affected sightings + their movement tracks + analytics buckets
 */
export const SchemaEarthquakeImpactResponse = SchemaDefaultReturn.extend({
    earthquakes: Vts.optional(Vts.array(SchemaEarthquakeEntry)),
    sightings: Vts.optional(Vts.array(SchemaEarthquakeImpactSighting)),
    tracks: Vts.optional(Vts.array(SchemaEarthquakeImpactTrack)),
    analytics: Vts.optional(SchemaEarthquakeImpactAnalytics),
}, {
    description: 'Result of /json/earthquake/impact — focus earthquakes + affected sightings + their movement tracks + analytics buckets',
});

/**
 * Type of schema EarthquakeImpactResponse
 */
export type EarthquakeImpactResponse = ExtractSchemaResultType<typeof SchemaEarthquakeImpactResponse>;