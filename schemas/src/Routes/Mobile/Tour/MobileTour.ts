import {ExtractSchemaResultType, Vts} from 'vts';
import {SchemaDefaultMobileV1Return} from '../Base/DefaultMobileV1Return.js';

/**
 * Schema of OpenTourVehicle
 */
export const SchemaOpenTourVehicle = Vts.object({
    id: Vts.number(),
    description: Vts.string(),
}, {
    description: '',
});

/**
 * Type of schema OpenTourVehicle
 */
export type OpenTourVehicle = ExtractSchemaResultType<typeof SchemaOpenTourVehicle>;

/**
 * Schema of OpenTourVehicleDriver
 */
export const SchemaOpenTourVehicleDriver = Vts.object({
    id: Vts.number(),
    description: Vts.string(),
}, {
    description: '',
});

/**
 * Type of schema OpenTourVehicleDriver
 */
export type OpenTourVehicleDriver = ExtractSchemaResultType<typeof SchemaOpenTourVehicleDriver>;

/**
 * Schema of OpenTourOrganization
 */
export const SchemaOpenTourOrganization = Vts.object({
    id: Vts.number(),
    description: Vts.string(),
    country: Vts.string(),
    location: Vts.string(),
    lat: Vts.string(),
    lon: Vts.string(),
}, {
    description: '',
});

/**
 * Type of schema OpenTourOrganization
 */
export type OpenTourOrganization = ExtractSchemaResultType<typeof SchemaOpenTourOrganization>;

/**
 * Schema of OpenTour
 */
export const SchemaOpenTour = Vts.object({
    id: Vts.number(),
    tour_start: Vts.string(),
    tour_end: Vts.string(),
    status: Vts.number(),
    vehicle_driver: SchemaOpenTourVehicleDriver,
    vehicle: SchemaOpenTourVehicle,
    organization: SchemaOpenTourOrganization,
}, {
    description: '',
});

/**
 * Type of schema OpenTour
 */
export type OpenTour = ExtractSchemaResultType<typeof SchemaOpenTour>;

/**
 * Schema of OpenTourResponse
 */
export const SchemaOpenTourResponse = SchemaDefaultMobileV1Return.extend({
    data: Vts.optional(SchemaOpenTour),
}, {
    description: '',
});

/**
 * Type of schema OpenTourResponse
 */
export type OpenTourResponse = ExtractSchemaResultType<typeof SchemaOpenTourResponse>;