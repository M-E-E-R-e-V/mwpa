import {ExtractSchemaResultType, Vts} from 'vts';
import {SchemaDefaultReturn} from 'figtree-schemas';

/**
 * Enum TableFilterTable
 */
export enum TableFilterTable {
    'sighting' = 'sighting',
}

/**
 * Schema of TableFilterEntry
 * A named, private filter preset of a frontend list table. settings is a JSON document owned by the table (e.g. SightingTableFilterSettings).
 */
export const SchemaTableFilterEntry = Vts.object({
    unid: Vts.string({description: 'Empty on create'}),
    table_name: Vts.string({description: 'Frontend table key, see TableFilterTable'}),
    name: Vts.string(),
    settings: Vts.string({description: 'JSON document (sorting + filters), shape owned by the table'}),
    position: Vts.number({description: 'Menu order'}),
}, {
    description: 'A named, private filter preset of a frontend list table. settings is a JSON document owned by the table (e.g. SightingTableFilterSettings).',
});

/**
 * Type of schema TableFilterEntry
 */
export type TableFilterEntry = ExtractSchemaResultType<typeof SchemaTableFilterEntry>;

/**
 * Schema of TableFilterListRequest
 */
export const SchemaTableFilterListRequest = Vts.object({
    table_name: Vts.optional(Vts.string()),
}, {
    description: '',
});

/**
 * Type of schema TableFilterListRequest
 */
export type TableFilterListRequest = ExtractSchemaResultType<typeof SchemaTableFilterListRequest>;

/**
 * Schema of TableFilterListResponse
 */
export const SchemaTableFilterListResponse = SchemaDefaultReturn.extend({
    list: Vts.optional(Vts.array(SchemaTableFilterEntry)),
}, {
    description: '',
});

/**
 * Type of schema TableFilterListResponse
 */
export type TableFilterListResponse = ExtractSchemaResultType<typeof SchemaTableFilterListResponse>;

/**
 * Schema of TableFilterSaveResponse
 */
export const SchemaTableFilterSaveResponse = SchemaDefaultReturn.extend({
    unid: Vts.optional(Vts.string()),
}, {
    description: '',
});

/**
 * Type of schema TableFilterSaveResponse
 */
export type TableFilterSaveResponse = ExtractSchemaResultType<typeof SchemaTableFilterSaveResponse>;

/**
 * Schema of TableFilterDeleteRequest
 */
export const SchemaTableFilterDeleteRequest = Vts.object({
    unid: Vts.string(),
}, {
    description: '',
});

/**
 * Type of schema TableFilterDeleteRequest
 */
export type TableFilterDeleteRequest = ExtractSchemaResultType<typeof SchemaTableFilterDeleteRequest>;

/**
 * Schema of SightingTableFilterSettings
 * Settings JSON of a sighting list preset. All fields optional; missing = no filter / default.
 */
export const SchemaSightingTableFilterSettings = Vts.object({
    sort_key: Vts.optional(Vts.string({description: 'Sort column: id | tour_id | date | tour_start | create_datetime | update_datetime (\'\' = default)'})),
    sort_dir: Vts.optional(Vts.string({description: 'ASC | DESC'})),
    period_mode: Vts.optional(Vts.string({description: '\'\' (none) | absolute | current_year | last_year | last_30_days | last_90_days | last_365_days — relative modes are resolved at load time'})),
    period_from: Vts.optional(Vts.string({description: 'YYYY-MM-DD, only used with period_mode=absolute'})),
    period_to: Vts.optional(Vts.string({description: 'YYYY-MM-DD, only used with period_mode=absolute'})),
    species_id: Vts.optional(Vts.number()),
    organization_id: Vts.optional(Vts.number()),
    vehicle_id: Vts.optional(Vts.number()),
    vehicle_driver_id: Vts.optional(Vts.number()),
    search: Vts.optional(Vts.string()),
    include_old: Vts.optional(Vts.boolean()),
}, {
    description: 'Settings JSON of a sighting list preset. All fields optional; missing = no filter / default.',
});

/**
 * Type of schema SightingTableFilterSettings
 */
export type SightingTableFilterSettings = ExtractSchemaResultType<typeof SchemaSightingTableFilterSettings>;