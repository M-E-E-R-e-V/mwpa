import {ExtractSchemaResultType, Vts} from 'vts';
import {SchemaDefaultMobileV1Return} from '../Base/DefaultMobileV1Return.js';
import {SchemaBehaviouralStateEntry} from '../../Main/BehaviouralStates/BehaviouralStates.js';
import {SchemaEncounterCategorieEntry} from '../../Main/EncounterCategories/EncounterCategories.js';
import {SchemaSpeciesEntry} from '../../Main/Species/Species.js';
import {SchemaVehicleEntry} from '../../Main/Vehicle/Vehicle.js';
import {SchemaVehicleDriverEntry} from '../../Main/VehicleDriver/VehicleDriver.js';
import {SchemaUserInfo} from '../../Main/User/User.js';

/**
 * Schema of MobileBehaviouralStatesResponse
 */
export const SchemaMobileBehaviouralStatesResponse = SchemaDefaultMobileV1Return.extend({
    list: Vts.array(SchemaBehaviouralStateEntry),
}, {
    description: '',
});

/**
 * Type of schema MobileBehaviouralStatesResponse
 */
export type MobileBehaviouralStatesResponse = ExtractSchemaResultType<typeof SchemaMobileBehaviouralStatesResponse>;

/**
 * Schema of MobileEncounterCategoriesResponse
 */
export const SchemaMobileEncounterCategoriesResponse = SchemaDefaultMobileV1Return.extend({
    list: Vts.array(SchemaEncounterCategorieEntry),
}, {
    description: '',
});

/**
 * Type of schema MobileEncounterCategoriesResponse
 */
export type MobileEncounterCategoriesResponse = ExtractSchemaResultType<typeof SchemaMobileEncounterCategoriesResponse>;

/**
 * Schema of MobileSpeciesListResponse
 */
export const SchemaMobileSpeciesListResponse = SchemaDefaultMobileV1Return.extend({
    list: Vts.array(SchemaSpeciesEntry),
}, {
    description: '',
});

/**
 * Type of schema MobileSpeciesListResponse
 */
export type MobileSpeciesListResponse = ExtractSchemaResultType<typeof SchemaMobileSpeciesListResponse>;

/**
 * Schema of MobileVehicleListResponse
 */
export const SchemaMobileVehicleListResponse = SchemaDefaultMobileV1Return.extend({
    list: Vts.array(SchemaVehicleEntry),
}, {
    description: '',
});

/**
 * Type of schema MobileVehicleListResponse
 */
export type MobileVehicleListResponse = ExtractSchemaResultType<typeof SchemaMobileVehicleListResponse>;

/**
 * Schema of MobileVehicleDriverListResponse
 */
export const SchemaMobileVehicleDriverListResponse = SchemaDefaultMobileV1Return.extend({
    list: Vts.array(SchemaVehicleDriverEntry),
}, {
    description: '',
});

/**
 * Type of schema MobileVehicleDriverListResponse
 */
export type MobileVehicleDriverListResponse = ExtractSchemaResultType<typeof SchemaMobileVehicleDriverListResponse>;

/**
 * Schema of MobileUserInfoResponse
 */
export const SchemaMobileUserInfoResponse = SchemaDefaultMobileV1Return.extend({
    data: Vts.optional(SchemaUserInfo),
}, {
    description: '',
});

/**
 * Type of schema MobileUserInfoResponse
 */
export type MobileUserInfoResponse = ExtractSchemaResultType<typeof SchemaMobileUserInfoResponse>;