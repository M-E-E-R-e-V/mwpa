import {ExtractSchemaResultType, Vts} from 'vts';
import {SchemaDefaultReturn} from 'figtree';

/**
 * Schema of OrganizationTrackingAreaRequestOrg
 */
export const SchemaOrganizationTrackingAreaRequestOrg = Vts.object({
    organization_id: Vts.number(),
    area_type: Vts.string(),
}, {
    description: '',
});

/**
 * Type of schema OrganizationTrackingAreaRequestOrg
 */
export type OrganizationTrackingAreaRequestOrg = ExtractSchemaResultType<typeof SchemaOrganizationTrackingAreaRequestOrg>;

/**
 * Schema of OrganizationTrackingAreaRequest
 */
export const SchemaOrganizationTrackingAreaRequest = Vts.object({
    id: Vts.optional(Vts.number()),
    organization: Vts.optional(SchemaOrganizationTrackingAreaRequestOrg),
}, {
    description: '',
});

/**
 * Type of schema OrganizationTrackingAreaRequest
 */
export type OrganizationTrackingAreaRequest = ExtractSchemaResultType<typeof SchemaOrganizationTrackingAreaRequest>;

/**
 * Schema of OrganizationTrackingAreaEntry
 */
export const SchemaOrganizationTrackingAreaEntry = Vts.object({
    id: Vts.number(),
    organization_id: Vts.number(),
    area_type: Vts.string(),
    geojsonstr: Vts.string(),
}, {
    description: '',
});

/**
 * Type of schema OrganizationTrackingAreaEntry
 */
export type OrganizationTrackingAreaEntry = ExtractSchemaResultType<typeof SchemaOrganizationTrackingAreaEntry>;

/**
 * Schema of OrganizationTrackingAreaRespose
 */
export const SchemaOrganizationTrackingAreaRespose = SchemaDefaultReturn.extend({
    data: Vts.optional(SchemaOrganizationTrackingAreaEntry),
}, {
    description: '',
});

/**
 * Type of schema OrganizationTrackingAreaRespose
 */
export type OrganizationTrackingAreaRespose = ExtractSchemaResultType<typeof SchemaOrganizationTrackingAreaRespose>;