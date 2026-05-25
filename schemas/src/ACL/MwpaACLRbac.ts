import {ExtractSchemaResultType, Vts} from 'vts';

/**
 * Enum Role
 */
export enum Role {
    'root' = 'root',
    'user' = 'user',
}

/**
 * Enum RightUsers
 */
export enum RightUsers {
    'users' = 'users',
    'users_read' = 'users_read',
    'users_write' = 'users_write',
    'users_delete' = 'users_delete',
    'users_roles_read' = 'users_roles_read',
    'users_roles_write' = 'users_roles_write',
}

/**
 * Enum RightSettings
 */
export enum RightSettings {
    'settings' = 'settings',
    'settings_read' = 'settings_read',
    'settings_write' = 'settings_write',
}

/**
 * Enum RightService
 */
export enum RightService {
    'service' = 'service',
    'service_status' = 'service_status',
    'service_start' = 'service_start',
    'service_stop' = 'service_stop',
    'service_invoke' = 'service_invoke',
}

/**
 * Enum RightUser
 */
export enum RightUser {
    'user' = 'user',
    'user_read' = 'user_read',
    'user_write' = 'user_write',
}

/**
 * Enum RightSightings
 */
export enum RightSightings {
    'sightings' = 'sightings',
    'sightings_read' = 'sightings_read',
    'sightings_write' = 'sightings_write',
    'sightings_mobile_read' = 'sightings_mobile_read',
    'sightings_mobile_write' = 'sightings_mobile_write',
}

/**
 * Enum RightApi
 */
export enum RightApi {
    'web' = 'web',
    'mobile' = 'mobile',
}

/**
 * Enum RightTours
 */
export enum RightTours {
    'tours' = 'tours',
    'tours_read' = 'tours_read',
    'tours_write' = 'tours_write',
    'tours_tracking_edit' = 'tours_tracking_edit',
}

/**
 * Schema of MwpaRights
 */
export const SchemaMwpaRights = Vts.or([Vts.enum(RightUsers), Vts.enum(RightSettings), Vts.enum(RightService), Vts.enum(RightUser), Vts.enum(RightSightings), Vts.enum(RightApi), Vts.enum(RightTours)], {});

/**
 * Type of schema MwpaRights
 */
export type MwpaRights = ExtractSchemaResultType<typeof SchemaMwpaRights>;