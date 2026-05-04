import {ExtractSchemaResultType, Vts} from 'vts';
import {SchemaDefaultReturn} from 'figtree-schemas';

/**
 * Schema of ToursFilter
 */
export const SchemaToursFilter = Vts.object({
    year: Vts.optional(Vts.number()),
    limit: Vts.optional(Vts.number()),
    offset: Vts.optional(Vts.number()),
}, {
    description: '',
});

/**
 * Type of schema ToursFilter
 */
export type ToursFilter = ExtractSchemaResultType<typeof SchemaToursFilter>;

/**
 * Schema of TourEntry
 */
export const SchemaTourEntry = Vts.object({
    id: Vts.number(),
    tour_fid: Vts.string(),
    device_id: Vts.number(),
    creater_id: Vts.number(),
    create_datetime: Vts.number(),
    update_datetime: Vts.number(),
    vehicle_id: Vts.number(),
    vehicle_driver_id: Vts.number(),
    beaufort_wind: Vts.string(),
    date: Vts.string(),
    tour_start: Vts.string(),
    tour_end: Vts.string(),
    organization_id: Vts.number(),
    status: Vts.number(),
    record_by_persons: Vts.string(),
    count_sightings: Vts.number(),
    count_trackings: Vts.number(),
}, {
    description: '',
});

/**
 * Type of schema TourEntry
 */
export type TourEntry = ExtractSchemaResultType<typeof SchemaTourEntry>;

/**
 * Schema of ToursDevice
 */
export const SchemaToursDevice = Vts.object({
    id: Vts.number(),
    name: Vts.string(),
}, {
    description: '',
});

/**
 * Type of schema ToursDevice
 */
export type ToursDevice = ExtractSchemaResultType<typeof SchemaToursDevice>;

/**
 * Schema of ToursCreater
 */
export const SchemaToursCreater = Vts.object({
    id: Vts.number(),
    name: Vts.string(),
}, {
    description: '',
});

/**
 * Type of schema ToursCreater
 */
export type ToursCreater = ExtractSchemaResultType<typeof SchemaToursCreater>;

/**
 * Schema of ToursListResponse
 */
export const SchemaToursListResponse = SchemaDefaultReturn.extend({
    filter: Vts.optional(SchemaToursFilter),
    offset: Vts.optional(Vts.number()),
    count: Vts.optional(Vts.number()),
    list: Vts.optional(Vts.array(SchemaTourEntry)),
    devices: Vts.optional(Vts.array(SchemaToursDevice)),
    creaters: Vts.optional(Vts.array(SchemaToursCreater)),
}, {
    description: '',
});

/**
 * Type of schema ToursListResponse
 */
export type ToursListResponse = ExtractSchemaResultType<typeof SchemaToursListResponse>;