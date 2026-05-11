import {ExtractSchemaResultType, Vts} from 'vts';
import {SchemaDefaultReturn} from 'figtree-schemas';

/**
 * Schema of SightingMovementTrackEntry
 * One segment (point N → point N+1) of a sighting movement, ready for map rendering.
 */
export const SchemaSightingMovementTrackEntry = Vts.object({
    sequence_no: Vts.number({description: 'Position inside the movement (0..N-1)'}),
    start_lat: Vts.number({description: 'WGS84 latitude (decimal degrees)'}),
    start_lon: Vts.number({description: 'WGS84 longitude (decimal degrees)'}),
    end_lat: Vts.number({description: 'WGS84 latitude (decimal degrees)'}),
    end_lon: Vts.number({description: 'WGS84 longitude (decimal degrees)'}),
    start_dt: Vts.number({description: 'Unix-seconds; 0 when unknown (manual_begin_end source)'}),
    end_dt: Vts.number({description: 'Unix-seconds; 0 when unknown'}),
    distance_m: Vts.number({description: 'Great-circle distance in metres'}),
    duration_s: Vts.number({description: 'end_dt - start_dt in seconds; 0 when timing unknown'}),
    speed_mps: Vts.optional(Vts.number({description: 'distance_m / duration_s; null when duration_s is 0'})),
    heading_deg: Vts.optional(Vts.number({description: 'Initial bearing 0..360 (0 = North); null when start==end'})),
    turning_angle_deg: Vts.optional(Vts.number({description: 'Signed change vs previous heading (-180..180); null for first segment'})),
    quality: Vts.string({description: '\'good\' or \'bad\' (GPS-jump suspect)'}),
}, {
    description: 'One segment (point N → point N+1) of a sighting movement, ready for map rendering.',
});

/**
 * Type of schema SightingMovementTrackEntry
 */
export type SightingMovementTrackEntry = ExtractSchemaResultType<typeof SchemaSightingMovementTrackEntry>;

/**
 * Schema of SightingMovementEntry
 * Per-sighting movement: aggregated header + full segment list. One entry per sighting that has a computed movement.
 */
export const SchemaSightingMovementEntry = Vts.object({
    sighting_id: Vts.number({description: 'Owning sighting id'}),
    source: Vts.string({description: '\'tracking\' | \'manual_begin_end\' | \'hybrid\''}),
    segment_count: Vts.number({description: 'Number of segments in tracks[]'}),
    total_distance_m: Vts.number({description: 'Sum of all segment distances'}),
    total_duration_s: Vts.number({description: 'Sum of all segment durations'}),
    avg_speed_mps: Vts.optional(Vts.number({description: 'Mean speed across good segments; null when no timed data'})),
    max_speed_mps: Vts.optional(Vts.number({description: 'Peak good-segment speed'})),
    dominant_heading_deg: Vts.optional(Vts.number({description: 'Circular mean of segment headings (0..360)'})),
    heading_variance_deg: Vts.optional(Vts.number({description: '"straight vs erratic" proxy'})),
    bbox_min_lat: Vts.optional(Vts.number({description: 'Bounding box (null when no points)'})),
    bbox_min_lon: Vts.optional(Vts.number({description: 'Bounding box'})),
    bbox_max_lat: Vts.optional(Vts.number({description: 'Bounding box'})),
    bbox_max_lon: Vts.optional(Vts.number({description: 'Bounding box'})),
    first_dt: Vts.number({description: 'Unix-seconds of first segment start (0 when unknown)'}),
    last_dt: Vts.number({description: 'Unix-seconds of last segment end'}),
    computed_at: Vts.number({description: 'Unix-seconds when this row was (re)computed'}),
    tracks: Vts.array(SchemaSightingMovementTrackEntry),
}, {
    description: 'Per-sighting movement: aggregated header + full segment list. One entry per sighting that has a computed movement.',
});

/**
 * Type of schema SightingMovementEntry
 */
export type SightingMovementEntry = ExtractSchemaResultType<typeof SchemaSightingMovementEntry>;

/**
 * Schema of SightingMovementListRequest
 * Body of POST /json/sighting/movement/list — bulk fetch by sighting ids. Missing ids (no computed movement) are omitted from the response.
 */
export const SchemaSightingMovementListRequest = Vts.object({
    sighting_ids: Vts.array(Vts.number({description: 'Sighting ids to fetch movements for. Unknown / uncomputed ids are silently skipped in the response.'})),
}, {
    description: 'Body of POST /json/sighting/movement/list — bulk fetch by sighting ids. Missing ids (no computed movement) are omitted from the response.',
});

/**
 * Type of schema SightingMovementListRequest
 */
export type SightingMovementListRequest = ExtractSchemaResultType<typeof SchemaSightingMovementListRequest>;

/**
 * Schema of SightingMovementListResponse
 * Response of POST /json/sighting/movement/list — movements for the requested sightings.
 */
export const SchemaSightingMovementListResponse = SchemaDefaultReturn.extend({
    list: Vts.array(SchemaSightingMovementEntry),
}, {
    description: 'Response of POST /json/sighting/movement/list — movements for the requested sightings.',
});

/**
 * Type of schema SightingMovementListResponse
 */
export type SightingMovementListResponse = ExtractSchemaResultType<typeof SchemaSightingMovementListResponse>;