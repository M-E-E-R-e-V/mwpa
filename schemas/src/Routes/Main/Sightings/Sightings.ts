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
    period_from: Vts.optional(Vts.string({description: 'ISO date YYYY-MM-DD; lower bound for sighting date (inclusive)'})),
    period_to: Vts.optional(Vts.string({description: 'ISO date YYYY-MM-DD; upper bound for sighting date (inclusive)'})),
    species_id: Vts.optional(Vts.number({description: 'Filter by species id'})),
    organization_id: Vts.optional(Vts.number({description: 'Filter by organization id'})),
    vehicle_id: Vts.optional(Vts.number({description: 'Filter by vehicle id'})),
    vehicle_driver_id: Vts.optional(Vts.number({description: 'Filter by vehicle driver id'})),
    search: Vts.optional(Vts.string({description: 'Free-text search applied as LIKE on note + recognizable_animals'})),
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
    track_point_count: Vts.optional(Vts.number({description: 'Number of GPS tracking points the boat recorded during the sighting window (segment_count + 1 for source=\'tracking\', omitted for manual_begin_end / no movement row). Lets the list-UI show which sightings actually have a real GPS track.'})),
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

/**
 * Schema of SightingSaveRequest
 * Update payload for an existing sighting (admin only). All fields are required; pass empty string / 0 to clear.
 */
export const SchemaSightingSaveRequest = Vts.object({
    id: Vts.number(),
    vehicle_id: Vts.number(),
    vehicle_driver_id: Vts.number(),
    beaufort_wind: Vts.string({description: 'Stored in beaufort_wind_n column. May contain decimals like "1.5".'}),
    date: Vts.string(),
    tour_start: Vts.optional(Vts.string()),
    tour_end: Vts.optional(Vts.string()),
    duration_from: Vts.optional(Vts.string()),
    duration_until: Vts.optional(Vts.string()),
    location_begin: Vts.string({description: 'JSON-stringified GeolocationCoordinates ("null" or "" for unset).'}),
    location_end: Vts.optional(Vts.string({description: 'JSON-stringified GeolocationCoordinates ("null" or "" for unset).'})),
    species_id: Vts.number(),
    species_count: Vts.number(),
    reaction_id: Vts.number(),
    other: Vts.optional(Vts.string()),
    other_vehicle: Vts.optional(Vts.string()),
    note: Vts.optional(Vts.string()),
}, {
    description: 'Update payload for an existing sighting (admin only). All fields are required; pass empty string / 0 to clear.',
});

/**
 * Type of schema SightingSaveRequest
 */
export type SightingSaveRequest = ExtractSchemaResultType<typeof SchemaSightingSaveRequest>;

/**
 * Schema of SightingYearsResponse
 */
export const SchemaSightingYearsResponse = SchemaDefaultReturn.extend({
    years: Vts.optional(Vts.array(Vts.number())),
}, {
    description: '',
});

/**
 * Type of schema SightingYearsResponse
 */
export type SightingYearsResponse = ExtractSchemaResultType<typeof SchemaSightingYearsResponse>;