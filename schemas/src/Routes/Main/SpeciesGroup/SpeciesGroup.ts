import {ExtractSchemaResultType, Vts} from 'vts';
import {SchemaDefaultReturn} from 'figtree-schemas';

/**
 * Schema of SpeciesGroupEntry
 */
export const SchemaSpeciesGroupEntry = Vts.object({
    id: Vts.number(),
    name: Vts.string(),
    color: Vts.string(),
}, {
    description: '',
});

/**
 * Type of schema SpeciesGroupEntry
 */
export type SpeciesGroupEntry = ExtractSchemaResultType<typeof SchemaSpeciesGroupEntry>;

/**
 * Schema of SpeciesGroupListResponse
 */
export const SchemaSpeciesGroupListResponse = SchemaDefaultReturn.extend({
    list: Vts.array(SchemaSpeciesGroupEntry),
}, {
    description: '',
});

/**
 * Type of schema SpeciesGroupListResponse
 */
export type SpeciesGroupListResponse = ExtractSchemaResultType<typeof SchemaSpeciesGroupListResponse>;