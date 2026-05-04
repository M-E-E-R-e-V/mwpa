import {ExtractSchemaResultType, Vts} from 'vts';
import {SchemaDefaultReturn} from 'figtree-schemas';

/**
 * Schema of VehicleDriverEntryUser
 */
export const SchemaVehicleDriverEntryUser = Vts.object({
    user_id: Vts.number(),
    name: Vts.string(),
}, {
    description: '',
});

/**
 * Type of schema VehicleDriverEntryUser
 */
export type VehicleDriverEntryUser = ExtractSchemaResultType<typeof SchemaVehicleDriverEntryUser>;

/**
 * Schema of VehicleDriverEntry
 */
export const SchemaVehicleDriverEntry = Vts.object({
    id: Vts.number(),
    description: Vts.string(),
    isdeleted: Vts.boolean(),
    user: SchemaVehicleDriverEntryUser,
}, {
    description: '',
});

/**
 * Type of schema VehicleDriverEntry
 */
export type VehicleDriverEntry = ExtractSchemaResultType<typeof SchemaVehicleDriverEntry>;

/**
 * Schema of VehicleDriverListResponse
 */
export const SchemaVehicleDriverListResponse = SchemaDefaultReturn.extend({
    list: Vts.array(SchemaVehicleDriverEntry),
}, {
    description: '',
});

/**
 * Type of schema VehicleDriverListResponse
 */
export type VehicleDriverListResponse = ExtractSchemaResultType<typeof SchemaVehicleDriverListResponse>;