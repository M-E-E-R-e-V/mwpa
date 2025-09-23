import {ExtractSchemaResultType, Vts} from 'vts';
import {SchemaDefaultReturn} from 'figtree';

/**
 * Schema of GroupEntry
 */
export const SchemaGroupEntry = Vts.object({
    id: Vts.number(),
    role: Vts.string(),
    organization_id: Vts.number(),
    description: Vts.string(),
}, {
    description: '',
});

/**
 * Type of schema GroupEntry
 */
export type GroupEntry = ExtractSchemaResultType<typeof SchemaGroupEntry>;

/**
 * Schema of GroupOrganization
 */
export const SchemaGroupOrganization = Vts.object({
    id: Vts.number(),
    name: Vts.string(),
    location: Vts.string(),
    lat: Vts.string(),
    lon: Vts.string(),
    country: Vts.string(),
}, {
    description: '',
});

/**
 * Type of schema GroupOrganization
 */
export type GroupOrganization = ExtractSchemaResultType<typeof SchemaGroupOrganization>;

/**
 * Schema of GroupListResponse
 */
export const SchemaGroupListResponse = SchemaDefaultReturn.extend({
    list: Vts.optional(Vts.array(SchemaGroupEntry)),
    organizationList: Vts.optional(Vts.array(SchemaGroupOrganization)),
}, {
    description: '',
});

/**
 * Type of schema GroupListResponse
 */
export type GroupListResponse = ExtractSchemaResultType<typeof SchemaGroupListResponse>;