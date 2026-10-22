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
 * Enum RightSpecies
 */
export enum RightSpecies {
    'species' = 'species',
    'species_read' = 'species_read',
    'species_write' = 'species_write',
    'species_delete' = 'species_delete',
}

/**
 * Enum RightVehicles
 */
export enum RightVehicles {
    'vehicles' = 'vehicles',
    'vehicles_read' = 'vehicles_read',
    'vehicles_write' = 'vehicles_write',
    'vehicles_delete' = 'vehicles_delete',
}

/**
 * Enum RightOrganizations
 */
export enum RightOrganizations {
    'organizations' = 'organizations',
    'organizations_read' = 'organizations_read',
    'organizations_write' = 'organizations_write',
    'organizations_delete' = 'organizations_delete',
}

/**
 * Enum RightGroups
 */
export enum RightGroups {
    'groups' = 'groups',
    'groups_read' = 'groups_read',
    'groups_write' = 'groups_write',
    'groups_delete' = 'groups_delete',
}

/**
 * Enum RightDevices
 */
export enum RightDevices {
    'devices' = 'devices',
    'devices_read' = 'devices_read',
    'devices_write' = 'devices_write',
    'devices_delete' = 'devices_delete',
}

/**
 * Enum RightBlacklist
 */
export enum RightBlacklist {
    'blacklist' = 'blacklist',
    'blacklist_read' = 'blacklist_read',
    'blacklist_write' = 'blacklist_write',
}

/**
 * Enum RightAis
 */
export enum RightAis {
    'ais' = 'ais',
    'ais_read' = 'ais_read',
}

/**
 * Enum RightEarthquake
 */
export enum RightEarthquake {
    'earthquake' = 'earthquake',
    'earthquake_read' = 'earthquake_read',
}

/**
 * Enum RightExternalTours
 */
export enum RightExternalTours {
    'external_tours' = 'external_tours',
    'external_tours_read' = 'external_tours_read',
    'external_tours_write' = 'external_tours_write',
}

/**
 * Enum RightExport
 */
export enum RightExport {
    'export' = 'export',
    'export_read' = 'export_read',
}

/**
 * Enum RightAnalytics
 */
export enum RightAnalytics {
    'analytics' = 'analytics',
    'analytics_read' = 'analytics_read',
}

/**
 * Enum RightCatalog
 */
export enum RightCatalog {
    'catalog' = 'catalog',
    'catalog_read' = 'catalog_read',
    'catalog_write' = 'catalog_write',
}

/**
 * Enum RightMap
 */
export enum RightMap {
    'map' = 'map',
    'map_read' = 'map_read',
}

/**
 * Enum RightQuickConnect
 */
export enum RightQuickConnect {
    'quick_connect' = 'quick_connect',
    'quick_connect_use' = 'quick_connect_use',
}

/**
 * Schema of MwpaRights
 */
export const SchemaMwpaRights = Vts.or([Vts.enum(RightUsers), Vts.enum(RightSettings), Vts.enum(RightService), Vts.enum(RightUser), Vts.enum(RightSightings), Vts.enum(RightApi), Vts.enum(RightTours), Vts.enum(RightSpecies), Vts.enum(RightVehicles), Vts.enum(RightOrganizations), Vts.enum(RightGroups), Vts.enum(RightDevices), Vts.enum(RightBlacklist), Vts.enum(RightAis), Vts.enum(RightEarthquake), Vts.enum(RightExternalTours), Vts.enum(RightExport), Vts.enum(RightAnalytics), Vts.enum(RightCatalog), Vts.enum(RightMap), Vts.enum(RightQuickConnect)], {});

/**
 * Type of schema MwpaRights
 */
export type MwpaRights = ExtractSchemaResultType<typeof SchemaMwpaRights>;