import {ExtractSchemaResultType, Vts} from 'vts';
import {SchemaDefaultReturn} from 'figtree-schemas';

/**
 * Schema of ToursFilterOrder
 * Sort directions per orderable column. Empty string means 'do not sort by this column'.
 */
export const SchemaToursFilterOrder = Vts.object({
    id: Vts.string(),
    date: Vts.string(),
    tour_start: Vts.string(),
    tour_end: Vts.string(),
    create_datetime: Vts.string(),
    update_datetime: Vts.string(),
    count_sightings: Vts.string(),
    count_trackings: Vts.string(),
}, {
    description: 'Sort directions per orderable column. Empty string means \'do not sort by this column\'.',
});

/**
 * Type of schema ToursFilterOrder
 */
export type ToursFilterOrder = ExtractSchemaResultType<typeof SchemaToursFilterOrder>;

/**
 * Schema of ToursFilter
 */
export const SchemaToursFilter = Vts.object({
    year: Vts.optional(Vts.number()),
    limit: Vts.optional(Vts.number()),
    offset: Vts.optional(Vts.number()),
    order: Vts.optional(SchemaToursFilterOrder),
    period_from: Vts.optional(Vts.string({description: 'ISO date YYYY-MM-DD; lower bound for tour date (inclusive)'})),
    period_to: Vts.optional(Vts.string({description: 'ISO date YYYY-MM-DD; upper bound for tour date (inclusive)'})),
    vehicle_id: Vts.optional(Vts.number({description: 'Filter by vehicle id'})),
    vehicle_driver_id: Vts.optional(Vts.number({description: 'Filter by vehicle driver id'})),
    organization_id: Vts.optional(Vts.number({description: 'Filter by organization id (only effective when current user has access)'})),
    search: Vts.optional(Vts.string({description: 'Free-text search applied as LIKE on record_by_persons + tour_fid'})),
    only_without_tracks: Vts.optional(Vts.boolean({description: 'When true, return only tours that have zero rows in sighting_tour_tracking'})),
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