import {ExtractSchemaResultType, Vts} from 'vts';
import {SchemaDefaultReturn} from 'figtree-schemas';

/**
 * Schema of VehicleEntry
 */
export const SchemaVehicleEntry = Vts.object({
    id: Vts.number({description: 'Vehicle id'}),
    name: Vts.string({description: 'Vehicle name (description column in DB)'}),
    isdeleted: Vts.boolean({description: 'Soft-deleted flag'}),
}, {
    description: '',
});

/**
 * Type of schema VehicleEntry
 */
export type VehicleEntry = ExtractSchemaResultType<typeof SchemaVehicleEntry>;

/**
 * Schema of VehicleListResponse
 */
export const SchemaVehicleListResponse = SchemaDefaultReturn.extend({
    list: Vts.array(SchemaVehicleEntry),
}, {
    description: '',
});

/**
 * Type of schema VehicleListResponse
 */
export type VehicleListResponse = ExtractSchemaResultType<typeof SchemaVehicleListResponse>;