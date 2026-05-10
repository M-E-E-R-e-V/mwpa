import {ExtractSchemaResultType, Vts} from 'vts';
import {SchemaDefaultReturn} from 'figtree-schemas';

/**
 * Schema of UsersRolesEntry
 */
export const SchemaUsersRolesEntry = Vts.object({
    id: Vts.number(),
    name: Vts.string(),
}, {
    description: '',
});

/**
 * Type of schema UsersRolesEntry
 */
export type UsersRolesEntry = ExtractSchemaResultType<typeof SchemaUsersRolesEntry>;

/**
 * Schema of UsersRolesListResponse
 */
export const SchemaUsersRolesListResponse = SchemaDefaultReturn.extend({
    list: Vts.optional(Vts.array(SchemaUsersRolesEntry)),
}, {
    description: '',
});

/**
 * Type of schema UsersRolesListResponse
 */
export type UsersRolesListResponse = ExtractSchemaResultType<typeof SchemaUsersRolesListResponse>;

/**
 * Schema of UsersRoleSaveRequest
 */
export const SchemaUsersRoleSaveRequest = Vts.object({
    id: Vts.number(),
    name: Vts.string(),
}, {
    description: '',
});

/**
 * Type of schema UsersRoleSaveRequest
 */
export type UsersRoleSaveRequest = ExtractSchemaResultType<typeof SchemaUsersRoleSaveRequest>;

/**
 * Schema of UsersRightsEntry
 */
export const SchemaUsersRightsEntry = Vts.object({
    id: Vts.number(),
    key: Vts.string(),
}, {
    description: '',
});

/**
 * Type of schema UsersRightsEntry
 */
export type UsersRightsEntry = ExtractSchemaResultType<typeof SchemaUsersRightsEntry>;

/**
 * Schema of UsersRightsListResponse
 */
export const SchemaUsersRightsListResponse = SchemaDefaultReturn.extend({
    list: Vts.optional(Vts.array(SchemaUsersRightsEntry)),
}, {
    description: '',
});

/**
 * Type of schema UsersRightsListResponse
 */
export type UsersRightsListResponse = ExtractSchemaResultType<typeof SchemaUsersRightsListResponse>;

/**
 * Schema of RoleRightsRequest
 */
export const SchemaRoleRightsRequest = Vts.object({
    role_id: Vts.number(),
}, {
    description: '',
});

/**
 * Type of schema RoleRightsRequest
 */
export type RoleRightsRequest = ExtractSchemaResultType<typeof SchemaRoleRightsRequest>;

/**
 * Schema of RoleRightEntry
 */
export const SchemaRoleRightEntry = Vts.object({
    right_id: Vts.number(),
    hasRight: Vts.boolean(),
}, {
    description: '',
});

/**
 * Type of schema RoleRightEntry
 */
export type RoleRightEntry = ExtractSchemaResultType<typeof SchemaRoleRightEntry>;

/**
 * Schema of RoleRightsListResponse
 */
export const SchemaRoleRightsListResponse = SchemaDefaultReturn.extend({
    list: Vts.optional(Vts.array(SchemaRoleRightEntry)),
}, {
    description: '',
});

/**
 * Type of schema RoleRightsListResponse
 */
export type RoleRightsListResponse = ExtractSchemaResultType<typeof SchemaRoleRightsListResponse>;

/**
 * Schema of RoleRightsSaveRequest
 */
export const SchemaRoleRightsSaveRequest = Vts.object({
    role_id: Vts.number(),
    list: Vts.array(SchemaRoleRightEntry),
}, {
    description: '',
});

/**
 * Type of schema RoleRightsSaveRequest
 */
export type RoleRightsSaveRequest = ExtractSchemaResultType<typeof SchemaRoleRightsSaveRequest>;

/**
 * Schema of GroupsRolesEntry
 */
export const SchemaGroupsRolesEntry = Vts.object({
    group_id: Vts.number(),
    role_ids: Vts.array(Vts.number()),
}, {
    description: '',
});

/**
 * Type of schema GroupsRolesEntry
 */
export type GroupsRolesEntry = ExtractSchemaResultType<typeof SchemaGroupsRolesEntry>;

/**
 * Schema of GroupsRolesListResponse
 */
export const SchemaGroupsRolesListResponse = SchemaDefaultReturn.extend({
    list: Vts.optional(Vts.array(SchemaGroupsRolesEntry)),
}, {
    description: '',
});

/**
 * Type of schema GroupsRolesListResponse
 */
export type GroupsRolesListResponse = ExtractSchemaResultType<typeof SchemaGroupsRolesListResponse>;

/**
 * Schema of GroupsRolesSaveRequest
 */
export const SchemaGroupsRolesSaveRequest = Vts.object({
    group_id: Vts.number(),
    role_ids: Vts.array(Vts.number()),
}, {
    description: '',
});

/**
 * Type of schema GroupsRolesSaveRequest
 */
export type GroupsRolesSaveRequest = ExtractSchemaResultType<typeof SchemaGroupsRolesSaveRequest>;