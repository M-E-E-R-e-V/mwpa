import {ExtractSchemaResultType, Vts} from 'vts';
import {SchemaDefaultReturn} from 'figtree';

/**
 * Schema of OrganizationEntry
 */
export const SchemaOrganizationEntry = Vts.object({
    id: Vts.number(),
    description: Vts.string(),
}, {
    description: '',
});

/**
 * Type of schema OrganizationEntry
 */
export type OrganizationEntry = ExtractSchemaResultType<typeof SchemaOrganizationEntry>;

/**
 * Schema of OrganizationUserListResponse
 */
export const SchemaOrganizationUserListResponse = SchemaDefaultReturn.extend({
    list: Vts.optional(Vts.array(SchemaOrganizationEntry)),
}, {
    description: '',
});

/**
 * Type of schema OrganizationUserListResponse
 */
export type OrganizationUserListResponse = ExtractSchemaResultType<typeof SchemaOrganizationUserListResponse>;

/**
 * Schema of OrganizationFullEntry
 */
export const SchemaOrganizationFullEntry = SchemaOrganizationEntry.extend({
    location: Vts.string(),
    lat: Vts.string(),
    lon: Vts.string(),
    country: Vts.string(),
}, {
    description: '',
});

/**
 * Type of schema OrganizationFullEntry
 */
export type OrganizationFullEntry = ExtractSchemaResultType<typeof SchemaOrganizationFullEntry>;

/**
 * Schema of OrganizationListResponse
 */
export const SchemaOrganizationListResponse = SchemaDefaultReturn.extend({
    list: Vts.optional(Vts.array(SchemaOrganizationFullEntry)),
}, {
    description: '',
});

/**
 * Type of schema OrganizationListResponse
 */
export type OrganizationListResponse = ExtractSchemaResultType<typeof SchemaOrganizationListResponse>;

/**
 * Schema of OrganizationGetRequest
 */
export const SchemaOrganizationGetRequest = Vts.object({
    id: Vts.number(),
}, {
    description: '',
});

/**
 * Type of schema OrganizationGetRequest
 */
export type OrganizationGetRequest = ExtractSchemaResultType<typeof SchemaOrganizationGetRequest>;

/**
 * Schema of OrganizationResponse
 */
export const SchemaOrganizationResponse = SchemaDefaultReturn.extend({
    data: Vts.optional(SchemaOrganizationFullEntry),
}, {
    description: '',
});

/**
 * Type of schema OrganizationResponse
 */
export type OrganizationResponse = ExtractSchemaResultType<typeof SchemaOrganizationResponse>;