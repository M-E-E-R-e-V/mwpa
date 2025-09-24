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
}, {
    description: '',
});

/**
 * Type of schema OrganizationListResponse
 */
export type OrganizationListResponse = ExtractSchemaResultType<typeof SchemaOrganizationListResponse>;