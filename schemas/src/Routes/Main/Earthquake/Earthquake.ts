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
 * Schema of EarthquakeImportRequest
 * Manual earthquake-import trigger (admin)
 */
export const SchemaEarthquakeImportRequest = Vts.object({
    backfill_from: Vts.optional(Vts.string({description: 'YYYY-MM-DD start for a backfill (default = last successful import or 30 days ago)'})),
}, {
    description: 'Manual earthquake-import trigger (admin)',
});

/**
 * Type of schema EarthquakeImportRequest
 */
export type EarthquakeImportRequest = ExtractSchemaResultType<typeof SchemaEarthquakeImportRequest>;

/**
 * Schema of EarthquakeImportResponse
 * Result of an earthquake-import run
 */
export const SchemaEarthquakeImportResponse = SchemaDefaultReturn.extend({
    imported: Vts.optional(Vts.number()),
    updated: Vts.optional(Vts.number()),
    correlations: Vts.optional(Vts.number({description: 'Number of sighting_seismic rows upserted'})),
}, {
    description: 'Result of an earthquake-import run',
});

/**
 * Type of schema EarthquakeImportResponse
 */
export type EarthquakeImportResponse = ExtractSchemaResultType<typeof SchemaEarthquakeImportResponse>;

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