import {ExtractSchemaResultType, Vts} from 'vts';
import {SchemaDefaultReturn} from 'figtree-schemas';

/**
 * Schema of DevicesEntry
 */
export const SchemaDevicesEntry = Vts.object({
    id: Vts.number(),
    identity: Vts.string({description: 'Mobile-side device identifier (UUID-ish).'}),
    description: Vts.string(),
    user_id: Vts.number(),
    user_name: Vts.string(),
    user_email: Vts.string(),
    organization_id: Vts.number(),
    organization_name: Vts.string(),
    create_datetime: Vts.number(),
    update_datetime: Vts.number(),
    sighting_count: Vts.number(),
    tour_count: Vts.number(),
    last_sighting_datetime: Vts.number({description: 'Most recent sighting upload timestamp from this device; 0 if none.'}),
}, {
    description: '',
});

/**
 * Type of schema DevicesEntry
 */
export type DevicesEntry = ExtractSchemaResultType<typeof SchemaDevicesEntry>;

/**
 * Schema of DevicesListResponse
 */
export const SchemaDevicesListResponse = SchemaDefaultReturn.extend({
    list: Vts.optional(Vts.array(SchemaDevicesEntry)),
}, {
    description: '',
});

/**
 * Type of schema DevicesListResponse
 */
export type DevicesListResponse = ExtractSchemaResultType<typeof SchemaDevicesListResponse>;