import {ExtractSchemaResultType, Vts} from 'vts';
import {SchemaTypeSighting} from './TypeSighting.js';
import {SchemaDefaultReturn} from 'figtree-schemas';

/**
 * Schema of SightingsFilterOrder
 */
export const SchemaSightingsFilterOrder = Vts.object({
    id: Vts.string(),
    tour_id: Vts.string(),
    date: Vts.string(),
    tour_start: Vts.string(),
    create_datetime: Vts.string(),
    update_datetime: Vts.string(),
}, {
    description: '',
});

/**
 * Type of schema SightingsFilterOrder
 */
export type SightingsFilterOrder = ExtractSchemaResultType<typeof SchemaSightingsFilterOrder>;

/**
 * Schema of SightingsFilter
 */
export const SchemaSightingsFilter = Vts.object({
    order: Vts.optional(SchemaSightingsFilterOrder),
    limit: Vts.optional(Vts.number()),
    offset: Vts.optional(Vts.number()),
}, {
    description: '',
});

/**
 * Type of schema SightingsFilter
 */
export type SightingsFilter = ExtractSchemaResultType<typeof SchemaSightingsFilter>;

/**
 * Schema of SightingsEntry
 * Sighting list entry — extends TypeSighting with response-side fields
 */
export const SchemaSightingsEntry = SchemaTypeSighting.extend({
    id: Vts.number(),
    creater_name: Vts.string(),
    create_datetime: Vts.number(),
    update_datetime: Vts.number(),
    device_id: Vts.number(),
    tour_id: Vts.number(),
    tour_fid: Vts.string(),
    hash: Vts.string(),
    hash_import_count: Vts.number(),
    source_import_file: Vts.string(),
    organization_id: Vts.number(),
    files: Vts.array(Vts.string()),
    pointtype: Vts.optional(Vts.string()),
    species_name: Vts.optional(Vts.string()),
}, {
    description: 'Sighting list entry — extends TypeSighting with response-side fields',
});

/**
 * Type of schema SightingsEntry
 */
export type SightingsEntry = ExtractSchemaResultType<typeof SchemaSightingsEntry>;

/**
 * Schema of SightingsListResponse
 */
export const SchemaSightingsListResponse = SchemaDefaultReturn.extend({
    filter: Vts.optional(SchemaSightingsFilter),
    offset: Vts.optional(Vts.number()),
    count: Vts.optional(Vts.number()),
    list: Vts.optional(Vts.array(SchemaSightingsEntry)),
}, {
    description: '',
});

/**
 * Type of schema SightingsListResponse
 */
export type SightingsListResponse = ExtractSchemaResultType<typeof SchemaSightingsListResponse>;

/**
 * Schema of SightingDeleteRequest
 */
export const SchemaSightingDeleteRequest = Vts.object({
    id: Vts.number(),
    description: Vts.string(),
}, {
    description: '',
});

/**
 * Type of schema SightingDeleteRequest
 */
export type SightingDeleteRequest = ExtractSchemaResultType<typeof SchemaSightingDeleteRequest>;

/**
 * Schema of SightingGPSUpdateData
 */
export const SchemaSightingGPSUpdateData = Vts.object({
    notHaveLocation: Vts.array(Vts.number()),
    notHaveTimestamp: Vts.array(Vts.number()),
    haveSameDate: Vts.array(Vts.number()),
    newDate: Vts.array(Vts.number()),
}, {
    description: '',
});

/**
 * Type of schema SightingGPSUpdateData
 */
export type SightingGPSUpdateData = ExtractSchemaResultType<typeof SchemaSightingGPSUpdateData>;

/**
 * Schema of SightingGPSUpdateResponse
 */
export const SchemaSightingGPSUpdateResponse = SchemaDefaultReturn.extend({
    data: Vts.optional(SchemaSightingGPSUpdateData),
}, {
    description: '',
});

/**
 * Type of schema SightingGPSUpdateResponse
 */
export type SightingGPSUpdateResponse = ExtractSchemaResultType<typeof SchemaSightingGPSUpdateResponse>;

/**
 * Schema of SightingWeatherRequest
 */
export const SchemaSightingWeatherRequest = Vts.object({
    id: Vts.number(),
}, {
    description: '',
});

/**
 * Type of schema SightingWeatherRequest
 */
export type SightingWeatherRequest = ExtractSchemaResultType<typeof SchemaSightingWeatherRequest>;

/**
 * Schema of SightingImageGetRequest
 * Path params for /json/sightings/getimage/:id/:filename
 */
export const SchemaSightingImageGetRequest = Vts.object({
    id: Vts.number(),
    filename: Vts.string(),
}, {
    description: 'Path params for /json/sightings/getimage/:id/:filename',
});

/**
 * Type of schema SightingImageGetRequest
 */
export type SightingImageGetRequest = ExtractSchemaResultType<typeof SchemaSightingImageGetRequest>;