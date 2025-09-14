import {ExtractSchemaResultType, Vts} from 'vts';
import {SchemaDefaultReturn} from 'figtree';

/**
 * Schema of EncounterCategorieEntry
 */
export const SchemaEncounterCategorieEntry = Vts.object({
    id: Vts.number(),
    name: Vts.string(),
    description: Vts.string(),
    isdeleted: Vts.boolean(),
}, {
    description: '',
});

/**
 * Type of schema EncounterCategorieEntry
 */
export type EncounterCategorieEntry = ExtractSchemaResultType<typeof SchemaEncounterCategorieEntry>;

/**
 * Schema of EncounterCategoriesResponse
 */
export const SchemaEncounterCategoriesResponse = SchemaDefaultReturn.extend({
    list: Vts.array(SchemaEncounterCategorieEntry),
}, {
    description: '',
});

/**
 * Type of schema EncounterCategoriesResponse
 */
export type EncounterCategoriesResponse = ExtractSchemaResultType<typeof SchemaEncounterCategoriesResponse>;