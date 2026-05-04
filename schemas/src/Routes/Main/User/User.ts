import {ExtractSchemaResultType, Vts} from 'vts';
import {SchemaDefaultReturn} from 'figtree-schemas';

/**
 * Schema of UserInfoData
 */
export const SchemaUserInfoData = Vts.object({
    id: Vts.number(),
    username: Vts.string(),
    fullname: Vts.string(),
    email: Vts.string(),
    isAdmin: Vts.boolean(),
}, {
    description: '',
});

/**
 * Type of schema UserInfoData
 */
export type UserInfoData = ExtractSchemaResultType<typeof SchemaUserInfoData>;

/**
 * Schema of UserInfoGroup
 */
export const SchemaUserInfoGroup = Vts.object({
    name: Vts.string(),
    id: Vts.number(),
}, {
    description: '',
});

/**
 * Type of schema UserInfoGroup
 */
export type UserInfoGroup = ExtractSchemaResultType<typeof SchemaUserInfoGroup>;

/**
 * Schema of UserInfoOrg
 */
export const SchemaUserInfoOrg = Vts.object({
    name: Vts.string(),
    id: Vts.number(),
    lat: Vts.string(),
    lon: Vts.string(),
}, {
    description: '',
});

/**
 * Type of schema UserInfoOrg
 */
export type UserInfoOrg = ExtractSchemaResultType<typeof SchemaUserInfoOrg>;

/**
 * Schema of UserInfo
 */
export const SchemaUserInfo = Vts.object({
    islogin: Vts.boolean(),
    user: Vts.optional(SchemaUserInfoData),
    group: Vts.optional(SchemaUserInfoGroup),
    organization: Vts.optional(SchemaUserInfoOrg),
}, {
    description: '',
});

/**
 * Type of schema UserInfo
 */
export type UserInfo = ExtractSchemaResultType<typeof SchemaUserInfo>;

/**
 * Schema of UserInfoResponse
 */
export const SchemaUserInfoResponse = SchemaDefaultReturn.extend({
    data: Vts.optional(SchemaUserInfo),
}, {
    description: '',
});

/**
 * Type of schema UserInfoResponse
 */
export type UserInfoResponse = ExtractSchemaResultType<typeof SchemaUserInfoResponse>;

/**
 * Schema of UserListFilterShow
 */
export const SchemaUserListFilterShow = Vts.object({
    show_disabled: Vts.optional(Vts.boolean()),
}, {
    description: '',
});

/**
 * Type of schema UserListFilterShow
 */
export type UserListFilterShow = ExtractSchemaResultType<typeof SchemaUserListFilterShow>;

/**
 * Schema of UserListFilter
 */
export const SchemaUserListFilter = Vts.object({
    filter: Vts.optional(SchemaUserListFilterShow),
    limit: Vts.optional(Vts.number()),
    offset: Vts.optional(Vts.number()),
}, {
    description: '',
});

/**
 * Type of schema UserListFilter
 */
export type UserListFilter = ExtractSchemaResultType<typeof SchemaUserListFilter>;

/**
 * Schema of UserData
 * Used for save and list. extends UserInfoData with credentials and disable flag
 */
export const SchemaUserData = Vts.object({
    id: Vts.number(),
    username: Vts.string(),
    fullname: Vts.string(),
    email: Vts.string(),
    isAdmin: Vts.boolean(),
    main_groupid: Vts.number(),
    password: Vts.optional(Vts.string()),
    password_repeat: Vts.optional(Vts.string()),
    pin: Vts.optional(Vts.string()),
    pin_repeat: Vts.optional(Vts.string()),
    disable: Vts.boolean(),
}, {
    description: 'Used for save and list. extends UserInfoData with credentials and disable flag',
});

/**
 * Type of schema UserData
 */
export type UserData = ExtractSchemaResultType<typeof SchemaUserData>;

/**
 * Schema of UserListResponse
 */
export const SchemaUserListResponse = SchemaDefaultReturn.extend({
    list: Vts.optional(Vts.array(SchemaUserData)),
}, {
    description: '',
});

/**
 * Type of schema UserListResponse
 */
export type UserListResponse = ExtractSchemaResultType<typeof SchemaUserListResponse>;

/**
 * Schema of UserSavePasswordRequest
 */
export const SchemaUserSavePasswordRequest = Vts.object({
    password: Vts.string(),
    repeatpassword: Vts.string(),
}, {
    description: '',
});

/**
 * Type of schema UserSavePasswordRequest
 */
export type UserSavePasswordRequest = ExtractSchemaResultType<typeof SchemaUserSavePasswordRequest>;

/**
 * Schema of UserSavePinRequest
 */
export const SchemaUserSavePinRequest = Vts.object({
    pin: Vts.string(),
    repeatpin: Vts.string(),
}, {
    description: '',
});

/**
 * Type of schema UserSavePinRequest
 */
export type UserSavePinRequest = ExtractSchemaResultType<typeof SchemaUserSavePinRequest>;