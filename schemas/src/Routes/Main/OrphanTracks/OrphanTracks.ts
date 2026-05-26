import {ExtractSchemaResultType, Vts} from 'vts';
import {SchemaDefaultReturn} from 'figtree-schemas';

/**
 * Schema of OrphanTracksFilter
 */
export const SchemaOrphanTracksFilter = Vts.object({
    period_from: Vts.optional(Vts.string()),
    period_to: Vts.optional(Vts.string()),
    device_id: Vts.optional(Vts.number()),
    limit: Vts.optional(Vts.number()),
    offset: Vts.optional(Vts.number()),
}, {
    description: '',
});

/**
 * Type of schema OrphanTracksFilter
 */
export type OrphanTracksFilter = ExtractSchemaResultType<typeof SchemaOrphanTracksFilter>;

/**
 * Schema of OrphanTrackEntry
 */
export const SchemaOrphanTrackEntry = Vts.object({
    tour_fid: Vts.string(),
    device_id: Vts.number(),
    vehicle_id: Vts.number(),
    vehicle_driver_id: Vts.number(),
    date: Vts.string(),
    tour_start: Vts.string(),
    count: Vts.number(),
    min_create_datetime: Vts.number(),
    max_create_datetime: Vts.number(),
}, {
    description: '',
});

/**
 * Type of schema OrphanTrackEntry
 */
export type OrphanTrackEntry = ExtractSchemaResultType<typeof SchemaOrphanTrackEntry>;

/**
 * Schema of OrphanTracksMatchCandidate
 */
export const SchemaOrphanTracksMatchCandidate = Vts.object({
    id: Vts.number(),
    tour_fid: Vts.string(),
    vehicle_id: Vts.number(),
    vehicle_driver_id: Vts.number(),
    date: Vts.string(),
    tour_start: Vts.string(),
    tour_end: Vts.string(),
    count_sightings: Vts.number(),
    count_trackings: Vts.number(),
}, {
    description: '',
});

/**
 * Type of schema OrphanTracksMatchCandidate
 */
export type OrphanTracksMatchCandidate = ExtractSchemaResultType<typeof SchemaOrphanTracksMatchCandidate>;

/**
 * Schema of OrphanTracksMatchRequest
 */
export const SchemaOrphanTracksMatchRequest = Vts.object({
    vehicle_id: Vts.optional(Vts.number()),
    vehicle_driver_id: Vts.optional(Vts.number()),
    date: Vts.optional(Vts.string()),
    tour_start: Vts.optional(Vts.string()),
}, {
    description: '',
});

/**
 * Type of schema OrphanTracksMatchRequest
 */
export type OrphanTracksMatchRequest = ExtractSchemaResultType<typeof SchemaOrphanTracksMatchRequest>;

/**
 * Schema of OrphanTracksAssignRequest
 */
export const SchemaOrphanTracksAssignRequest = Vts.object({
    tour_fid: Vts.string(),
    device_id: Vts.number(),
    target_tour_id: Vts.number(),
}, {
    description: '',
});

/**
 * Type of schema OrphanTracksAssignRequest
 */
export type OrphanTracksAssignRequest = ExtractSchemaResultType<typeof SchemaOrphanTracksAssignRequest>;

/**
 * Schema of OrphanTracksListResponse
 */
export const SchemaOrphanTracksListResponse = SchemaDefaultReturn.extend({
    filter: Vts.optional(SchemaOrphanTracksFilter),
    offset: Vts.optional(Vts.number()),
    count: Vts.optional(Vts.number()),
    list: Vts.optional(Vts.array(SchemaOrphanTrackEntry)),
}, {
    description: '',
});

/**
 * Type of schema OrphanTracksListResponse
 */
export type OrphanTracksListResponse = ExtractSchemaResultType<typeof SchemaOrphanTracksListResponse>;

/**
 * Schema of OrphanTracksMatchResponse
 */
export const SchemaOrphanTracksMatchResponse = SchemaDefaultReturn.extend({
    list: Vts.optional(Vts.array(SchemaOrphanTracksMatchCandidate)),
}, {
    description: '',
});

/**
 * Type of schema OrphanTracksMatchResponse
 */
export type OrphanTracksMatchResponse = ExtractSchemaResultType<typeof SchemaOrphanTracksMatchResponse>;

/**
 * Schema of OrphanTracksAssignResponse
 */
export const SchemaOrphanTracksAssignResponse = SchemaDefaultReturn.extend({
    promoted: Vts.optional(Vts.number()),
}, {
    description: '',
});

/**
 * Type of schema OrphanTracksAssignResponse
 */
export type OrphanTracksAssignResponse = ExtractSchemaResultType<typeof SchemaOrphanTracksAssignResponse>;

/**
 * Schema of OrphanTracksPoint
 * One decoded pending-track point — lat/lon + timestamp (s since epoch) for the map preview in the AssignModal
 */
export const SchemaOrphanTracksPoint = Vts.object({
    lat: Vts.number(),
    lon: Vts.number(),
    ts: Vts.number({description: 'create_datetime in seconds since epoch — matches the source row\'s value'}),
}, {
    description: 'One decoded pending-track point — lat/lon + timestamp (s since epoch) for the map preview in the AssignModal',
});

/**
 * Type of schema OrphanTracksPoint
 */
export type OrphanTracksPoint = ExtractSchemaResultType<typeof SchemaOrphanTracksPoint>;

/**
 * Schema of OrphanTracksPointsRequest
 * Fetch decoded points for one orphan bucket (tour_fid + device_id) to draw on the AssignModal map
 */
export const SchemaOrphanTracksPointsRequest = Vts.object({
    tour_fid: Vts.string(),
    device_id: Vts.number(),
}, {
    description: 'Fetch decoded points for one orphan bucket (tour_fid + device_id) to draw on the AssignModal map',
});

/**
 * Type of schema OrphanTracksPointsRequest
 */
export type OrphanTracksPointsRequest = ExtractSchemaResultType<typeof SchemaOrphanTracksPointsRequest>;

/**
 * Schema of OrphanTracksPointsResponse
 * Decoded points for an orphan bucket — ordered by timestamp ascending
 */
export const SchemaOrphanTracksPointsResponse = SchemaDefaultReturn.extend({
    points: Vts.optional(Vts.array(SchemaOrphanTracksPoint)),
}, {
    description: 'Decoded points for an orphan bucket — ordered by timestamp ascending',
});

/**
 * Type of schema OrphanTracksPointsResponse
 */
export type OrphanTracksPointsResponse = ExtractSchemaResultType<typeof SchemaOrphanTracksPointsResponse>;

/**
 * Schema of OrphanTracksDeleteRequest
 * Drop the entire pending bucket for (tour_fid, device_id) without promoting — used when the admin decides the orphan is junk
 */
export const SchemaOrphanTracksDeleteRequest = Vts.object({
    tour_fid: Vts.string(),
    device_id: Vts.number(),
}, {
    description: 'Drop the entire pending bucket for (tour_fid, device_id) without promoting — used when the admin decides the orphan is junk',
});

/**
 * Type of schema OrphanTracksDeleteRequest
 */
export type OrphanTracksDeleteRequest = ExtractSchemaResultType<typeof SchemaOrphanTracksDeleteRequest>;

/**
 * Schema of OrphanTracksDeleteResponse
 * Result of dropping an orphan bucket — `deleted` echoes the row count that was in the bucket before
 */
export const SchemaOrphanTracksDeleteResponse = SchemaDefaultReturn.extend({
    deleted: Vts.optional(Vts.number()),
}, {
    description: 'Result of dropping an orphan bucket — `deleted` echoes the row count that was in the bucket before',
});

/**
 * Type of schema OrphanTracksDeleteResponse
 */
export type OrphanTracksDeleteResponse = ExtractSchemaResultType<typeof SchemaOrphanTracksDeleteResponse>;