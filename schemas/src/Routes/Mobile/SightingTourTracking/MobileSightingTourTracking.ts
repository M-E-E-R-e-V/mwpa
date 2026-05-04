import {ExtractSchemaResultType, Vts} from 'vts';
import {SchemaDefaultMobileV1Return} from '../Base/DefaultMobileV1Return.js';

/**
 * Schema of SightingTourTrackingEntry
 */
export const SchemaSightingTourTrackingEntry = Vts.object({
    unid: Vts.string(),
    tour_fid: Vts.string(),
    location: Vts.string(),
    date: Vts.string(),
}, {
    description: '',
});

/**
 * Type of schema SightingTourTrackingEntry
 */
export type SightingTourTrackingEntry = ExtractSchemaResultType<typeof SchemaSightingTourTrackingEntry>;

/**
 * Schema of SightingTourTrackingRequest
 */
export const SchemaSightingTourTrackingRequest = Vts.object({
    list: Vts.array(SchemaSightingTourTrackingEntry),
}, {
    description: '',
});

/**
 * Type of schema SightingTourTrackingRequest
 */
export type SightingTourTrackingRequest = ExtractSchemaResultType<typeof SchemaSightingTourTrackingRequest>;

/**
 * Schema of SightingTourTrackingCheckRequest
 */
export const SchemaSightingTourTrackingCheckRequest = Vts.object({
    tour_fid: Vts.string(),
    count: Vts.number(),
}, {
    description: '',
});

/**
 * Type of schema SightingTourTrackingCheckRequest
 */
export type SightingTourTrackingCheckRequest = ExtractSchemaResultType<typeof SchemaSightingTourTrackingCheckRequest>;

/**
 * Schema of SightingTourTrackingCheckResponse
 */
export const SchemaSightingTourTrackingCheckResponse = SchemaDefaultMobileV1Return.extend({
    isComplete: Vts.optional(Vts.boolean()),
    canDelete: Vts.optional(Vts.boolean()),
}, {
    description: '',
});

/**
 * Type of schema SightingTourTrackingCheckResponse
 */
export type SightingTourTrackingCheckResponse = ExtractSchemaResultType<typeof SchemaSightingTourTrackingCheckResponse>;