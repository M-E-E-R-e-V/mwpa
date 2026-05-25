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