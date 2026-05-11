import {ExtractSchemaResultType, Vts} from 'vts';
import {SchemaDefaultReturn} from 'figtree-schemas';

/**
 * Schema of VehicleEntry
 */
export const SchemaVehicleEntry = Vts.object({
    id: Vts.number({description: 'Vehicle id'}),
    name: Vts.string({description: 'Vehicle name (description column in DB)'}),
    isdeleted: Vts.boolean({description: 'Soft-deleted flag'}),
    organization_id: Vts.number({description: 'Organization the vehicle belongs to'}),
    in_use: Vts.boolean({description: 'Whether the vehicle is currently active in use. Drives visibility in operational pickers (tour creation, AROC report). Independent of soft-delete.'}),
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

/**
 * Schema of VehicleDeleteRequest
 * Body of POST /json/vehicle/delete — soft-deletes the vehicle with the given id.
 */
export const SchemaVehicleDeleteRequest = Vts.object({
    id: Vts.number({description: 'Vehicle id to delete'}),
}, {
    description: 'Body of POST /json/vehicle/delete — soft-deletes the vehicle with the given id.',
});

/**
 * Type of schema VehicleDeleteRequest
 */
export type VehicleDeleteRequest = ExtractSchemaResultType<typeof SchemaVehicleDeleteRequest>;