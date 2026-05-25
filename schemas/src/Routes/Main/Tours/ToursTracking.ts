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

/**
 * Schema of ToursTrackingDeleteRequest
 * Delete tracking points within a time range from a tour (admin only)
 */
export const SchemaToursTrackingDeleteRequest = Vts.object({
    tour_id: Vts.number(),
    timestamp_from: Vts.number({description: 'Inclusive ms epoch start of range'}),
    timestamp_to: Vts.number({description: 'Inclusive ms epoch end of range'}),
}, {
    description: 'Delete tracking points within a time range from a tour (admin only)',
});

/**
 * Type of schema ToursTrackingDeleteRequest
 */
export type ToursTrackingDeleteRequest = ExtractSchemaResultType<typeof SchemaToursTrackingDeleteRequest>;

/**
 * Schema of ToursTrackingDeleteResponse
 * Number of deleted tracking points
 */
export const SchemaToursTrackingDeleteResponse = SchemaDefaultReturn.extend({
    deleted: Vts.optional(Vts.number()),
}, {
    description: 'Number of deleted tracking points',
});

/**
 * Type of schema ToursTrackingDeleteResponse
 */
export type ToursTrackingDeleteResponse = ExtractSchemaResultType<typeof SchemaToursTrackingDeleteResponse>;

/**
 * Schema of ToursTrackingTransferRequest
 * Transfer tracking points within a time range from one tour to another (admin only)
 */
export const SchemaToursTrackingTransferRequest = Vts.object({
    tour_id_from: Vts.number(),
    tour_id_to: Vts.number(),
    timestamp_from: Vts.number(),
    timestamp_to: Vts.number(),
}, {
    description: 'Transfer tracking points within a time range from one tour to another (admin only)',
});

/**
 * Type of schema ToursTrackingTransferRequest
 */
export type ToursTrackingTransferRequest = ExtractSchemaResultType<typeof SchemaToursTrackingTransferRequest>;

/**
 * Schema of ToursTrackingTransferResponse
 * Number of transferred tracking points
 */
export const SchemaToursTrackingTransferResponse = SchemaDefaultReturn.extend({
    transferred: Vts.optional(Vts.number()),
}, {
    description: 'Number of transferred tracking points',
});

/**
 * Type of schema ToursTrackingTransferResponse
 */
export type ToursTrackingTransferResponse = ExtractSchemaResultType<typeof SchemaToursTrackingTransferResponse>;

/**
 * Schema of ToursTrackingNeighborsRequest
 * Lookup previous/next-day tours for a given tour (same vehicle)
 */
export const SchemaToursTrackingNeighborsRequest = Vts.object({
    tour_id: Vts.number(),
}, {
    description: 'Lookup previous/next-day tours for a given tour (same vehicle)',
});

/**
 * Type of schema ToursTrackingNeighborsRequest
 */
export type ToursTrackingNeighborsRequest = ExtractSchemaResultType<typeof SchemaToursTrackingNeighborsRequest>;

/**
 * Schema of ToursTrackingNeighborTour
 * Compact tour reference for neighbor selection
 */
export const SchemaToursTrackingNeighborTour = Vts.object({
    id: Vts.number(),
    date: Vts.string(),
    tour_start: Vts.string(),
    tour_end: Vts.string(),
    vehicle_id: Vts.number(),
    count_trackings: Vts.number(),
}, {
    description: 'Compact tour reference for neighbor selection',
});

/**
 * Type of schema ToursTrackingNeighborTour
 */
export type ToursTrackingNeighborTour = ExtractSchemaResultType<typeof SchemaToursTrackingNeighborTour>;

/**
 * Schema of ToursTrackingNeighborsResponse
 * Optional previous/next tour for same vehicle
 */
export const SchemaToursTrackingNeighborsResponse = SchemaDefaultReturn.extend({
    prev: Vts.optional(SchemaToursTrackingNeighborTour),
    next: Vts.optional(SchemaToursTrackingNeighborTour),
}, {
    description: 'Optional previous/next tour for same vehicle',
});

/**
 * Type of schema ToursTrackingNeighborsResponse
 */
export type ToursTrackingNeighborsResponse = ExtractSchemaResultType<typeof SchemaToursTrackingNeighborsResponse>;