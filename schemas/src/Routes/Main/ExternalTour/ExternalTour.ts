import {ExtractSchemaResultType, Vts} from 'vts';
import {SchemaDefaultReturn} from 'figtree-schemas';

/**
 * Schema of ExternalTourSourceEntry
 * One row from organization_external_tour_source — provider config for an organization (e.g. FareHarbor pull settings).
 */
export const SchemaExternalTourSourceEntry = Vts.object({
    id: Vts.number({description: 'Row id. 0 on save means insert.'}),
    organization_id: Vts.number(),
    provider: Vts.string({description: 'Provider key, e.g. \'fareharbor\'.'}),
    base_url: Vts.string(),
    company_shortname: Vts.string({description: 'FareHarbor URL slug (e.g. \'whalewatching-gomera\').'}),
    item_pks: Vts.array(Vts.string({description: 'Provider item ids to pull (empty array = all items the provider exposes).'})),
    enabled: Vts.boolean(),
    last_full_pull_at: Vts.optional(Vts.number({description: 'Unix seconds of last successful refresh; 0/undefined = never.'})),
    last_error: Vts.optional(Vts.string({description: 'Last failure message (cleared on next successful pull).'})),
}, {
    description: 'One row from organization_external_tour_source — provider config for an organization (e.g. FareHarbor pull settings).',
});

/**
 * Type of schema ExternalTourSourceEntry
 */
export type ExternalTourSourceEntry = ExtractSchemaResultType<typeof SchemaExternalTourSourceEntry>;

/**
 * Schema of ExternalTourCustomerType
 * Per-customer-type pricing breakdown carried inside an ExternalTourEntry.
 */
export const SchemaExternalTourCustomerType = Vts.object({
    name: Vts.string(),
    note: Vts.string(),
    capacity: Vts.optional(Vts.number()),
    price_cents: Vts.number(),
    currency: Vts.string(),
}, {
    description: 'Per-customer-type pricing breakdown carried inside an ExternalTourEntry.',
});

/**
 * Type of schema ExternalTourCustomerType
 */
export type ExternalTourCustomerType = ExtractSchemaResultType<typeof SchemaExternalTourCustomerType>;

/**
 * Schema of ExternalTourEntry
 * One row from external_tour — a planned tour slot pulled from an external booking provider.
 */
export const SchemaExternalTourEntry = Vts.object({
    id: Vts.number(),
    organization_id: Vts.number(),
    source_id: Vts.number(),
    provider: Vts.string(),
    external_id: Vts.string(),
    item_pk: Vts.string(),
    item_name: Vts.string(),
    start_at: Vts.number({description: 'Local wall-clock start time as unix seconds.'}),
    start_at_utc: Vts.number(),
    end_at: Vts.number(),
    duration_text: Vts.string(),
    meeting_lat: Vts.optional(Vts.number()),
    meeting_lon: Vts.optional(Vts.number()),
    meeting_name: Vts.string(),
    capacity_bookable: Vts.number(),
    capacity_reserved: Vts.number(),
    is_bookable: Vts.boolean(),
    is_sold_out: Vts.boolean(),
    customer_types: Vts.array(SchemaExternalTourCustomerType),
    currency: Vts.string(),
    last_seen_at: Vts.number(),
    last_updated_at: Vts.number(),
}, {
    description: 'One row from external_tour — a planned tour slot pulled from an external booking provider.',
});

/**
 * Type of schema ExternalTourEntry
 */
export type ExternalTourEntry = ExtractSchemaResultType<typeof SchemaExternalTourEntry>;

/**
 * Schema of ExternalTourSourceListResponse
 * List of source-config rows. Extends DefaultReturn for status code envelope.
 */
export const SchemaExternalTourSourceListResponse = SchemaDefaultReturn.extend({
    list: Vts.array(SchemaExternalTourSourceEntry),
}, {
    description: 'List of source-config rows. Extends DefaultReturn for status code envelope.',
});

/**
 * Type of schema ExternalTourSourceListResponse
 */
export type ExternalTourSourceListResponse = ExtractSchemaResultType<typeof SchemaExternalTourSourceListResponse>;

/**
 * Schema of ExternalTourSourceDeleteRequest
 * Delete one source-config by id.
 */
export const SchemaExternalTourSourceDeleteRequest = Vts.object({
    id: Vts.number(),
}, {
    description: 'Delete one source-config by id.',
});

/**
 * Type of schema ExternalTourSourceDeleteRequest
 */
export type ExternalTourSourceDeleteRequest = ExtractSchemaResultType<typeof SchemaExternalTourSourceDeleteRequest>;

/**
 * Schema of ExternalTourListRequest
 * Filter the planned tour slots by org + UTC window (inclusive).
 */
export const SchemaExternalTourListRequest = Vts.object({
    organization_id: Vts.optional(Vts.number({description: 'When omitted, returns slots for every org the caller can see.'})),
    from_utc: Vts.optional(Vts.number({description: 'Lower-bound start_at_utc in unix seconds (inclusive); default = now.'})),
    to_utc: Vts.optional(Vts.number({description: 'Upper-bound start_at_utc in unix seconds (inclusive); default = now+60d.'})),
}, {
    description: 'Filter the planned tour slots by org + UTC window (inclusive).',
});

/**
 * Type of schema ExternalTourListRequest
 */
export type ExternalTourListRequest = ExtractSchemaResultType<typeof SchemaExternalTourListRequest>;

/**
 * Schema of ExternalTourListResponse
 * Planned tour slots within the requested window.
 */
export const SchemaExternalTourListResponse = SchemaDefaultReturn.extend({
    list: Vts.array(SchemaExternalTourEntry),
}, {
    description: 'Planned tour slots within the requested window.',
});

/**
 * Type of schema ExternalTourListResponse
 */
export type ExternalTourListResponse = ExtractSchemaResultType<typeof SchemaExternalTourListResponse>;