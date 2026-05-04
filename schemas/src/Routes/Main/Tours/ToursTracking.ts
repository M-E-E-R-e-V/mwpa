import {ExtractSchemaResultType, Vts} from 'vts';
import {SchemaDefaultReturn} from 'figtree-schemas';

/**
 * Schema of ToursTrackingRequest
 */
export const SchemaToursTrackingRequest = Vts.object({
    tour_id: Vts.number(),
}, {
    description: '',
});

/**
 * Type of schema ToursTrackingRequest
 */
export type ToursTrackingRequest = ExtractSchemaResultType<typeof SchemaToursTrackingRequest>;

/**
 * Schema of ToursTrackingSightingExtended
 */
export const SchemaToursTrackingSightingExtended = Vts.object({
    unid: Vts.string(),
    name: Vts.string(),
    data: Vts.string(),
}, {
    description: '',
});

/**
 * Type of schema ToursTrackingSightingExtended
 */
export type ToursTrackingSightingExtended = ExtractSchemaResultType<typeof SchemaToursTrackingSightingExtended>;

/**
 * Schema of ToursTrackingSightingData
 */
export const SchemaToursTrackingSightingData = Vts.object({
    id: Vts.number(),
    location_begin: Vts.string(),
    location_end: Vts.string(),
    pointtype: Vts.string(),
    species_id: Vts.number(),
    species_name: Vts.string(),
    species_count: Vts.number(),
    distance_coast: Vts.string(),
    files: Vts.array(Vts.string()),
    extended: Vts.array(SchemaToursTrackingSightingExtended),
}, {
    description: '',
});

/**
 * Type of schema ToursTrackingSightingData
 */
export type ToursTrackingSightingData = ExtractSchemaResultType<typeof SchemaToursTrackingSightingData>;

/**
 * Schema of ToursTrackingData
 */
export const SchemaToursTrackingData = Vts.object({
    date: Vts.string(),
    start: Vts.string(),
    end: Vts.string(),
    positions: Vts.array(Vts.string()),
    sightings: Vts.array(SchemaToursTrackingSightingData),
    org_id: Vts.number(),
}, {
    description: '',
});

/**
 * Type of schema ToursTrackingData
 */
export type ToursTrackingData = ExtractSchemaResultType<typeof SchemaToursTrackingData>;

/**
 * Schema of ToursTrackingResponse
 */
export const SchemaToursTrackingResponse = SchemaDefaultReturn.extend({
    tracking: Vts.optional(SchemaToursTrackingData),
}, {
    description: '',
});

/**
 * Type of schema ToursTrackingResponse
 */
export type ToursTrackingResponse = ExtractSchemaResultType<typeof SchemaToursTrackingResponse>;