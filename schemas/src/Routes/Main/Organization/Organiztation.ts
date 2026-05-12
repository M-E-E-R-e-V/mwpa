import {ExtractSchemaResultType, Vts} from 'vts';
import {SchemaDefaultReturn} from 'figtree-schemas';

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
    province: Vts.string({description: 'Provincia of the company seat — feeds AROC datos GENERALES.'}),
    island: Vts.string({description: 'Isla — feeds AROC datos GENERALES.'}),
    port: Vts.string({description: 'Puerto — feeds AROC datos GENERALES.'}),
    email: Vts.string({description: 'Contact e-mail of the company — AROC datos GENERALES.'}),
    web: Vts.string({description: 'Public web address of the company — AROC datos GENERALES.'}),
    aroc_reference: Vts.string({description: 'AROC authorization reference (Referencia) — written into datos GENERALES B5.'}),
    aroc_region: Vts.string({description: 'AROC region code (CAN/RES/AND).'}),
    aroc_number: Vts.string({description: 'AROC authorization number (Número).'}),
    aroc_authorized_boats: Vts.number({description: 'Number of authorized boats under the AROC reference. 0 = unset.'}),
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