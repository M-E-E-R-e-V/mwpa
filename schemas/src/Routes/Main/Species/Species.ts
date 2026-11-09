import {ExtractSchemaResultType, Vts} from 'vts';
import {SchemaDefaultReturn} from 'figtree-schemas';

/**
 * Schema of SpeciesEntryGroup
 * Embedded species group info inside SpeciesEntry
 */
export const SchemaSpeciesEntryGroup = Vts.object({
    name: Vts.string(),
    color: Vts.string(),
}, {
    description: 'Embedded species group info inside SpeciesEntry',
});

/**
 * Type of schema SpeciesEntryGroup
 */
export type SpeciesEntryGroup = ExtractSchemaResultType<typeof SchemaSpeciesEntryGroup>;

/**
 * Schema of SpeciesEntry
 */
export const SchemaSpeciesEntry = Vts.object({
    id: Vts.number(),
    name: Vts.string(),
    ottid: Vts.number({description: 'Open Tree of Life ID'}),
    isdeleted: Vts.optional(Vts.boolean()),
    species_groupid: Vts.number(),
    species_group: Vts.optional(SchemaSpeciesEntryGroup),
    aphiaid: Vts.optional(Vts.number({description: 'WoRMS aphiaID — marine species identifier (https://www.marinespecies.org). Optional/0 if not yet mapped.'})),
    image: Vts.optional(Vts.string({description: 'File name of the uploaded species image (served via /json/species/image/:id/:filename). Empty/missing = no own image, the UI falls back to the built-in silhouette.'})),
}, {
    description: '',
});

/**
 * Type of schema SpeciesEntry
 */
export type SpeciesEntry = ExtractSchemaResultType<typeof SchemaSpeciesEntry>;

/**
 * Schema of SpeciesListResponse
 */
export const SchemaSpeciesListResponse = SchemaDefaultReturn.extend({
    list: Vts.array(SchemaSpeciesEntry),
}, {
    description: '',
});

/**
 * Type of schema SpeciesListResponse
 */
export type SpeciesListResponse = ExtractSchemaResultType<typeof SchemaSpeciesListResponse>;

/**
 * Schema of SpeciesMergeRequest
 */
export const SchemaSpeciesMergeRequest = Vts.object({
    source_id: Vts.number(),
    destination_id: Vts.number(),
}, {
    description: '',
});

/**
 * Type of schema SpeciesMergeRequest
 */
export type SpeciesMergeRequest = ExtractSchemaResultType<typeof SchemaSpeciesMergeRequest>;

/**
 * Schema of SpeciesDeleteRequest
 */
export const SchemaSpeciesDeleteRequest = Vts.object({
    id: Vts.number(),
}, {
    description: '',
});

/**
 * Type of schema SpeciesDeleteRequest
 */
export type SpeciesDeleteRequest = ExtractSchemaResultType<typeof SchemaSpeciesDeleteRequest>;

/**
 * Schema of SpeciesImageGetRequest
 * Path params for /json/species/image/:id/:filename
 */
export const SchemaSpeciesImageGetRequest = Vts.object({
    id: Vts.number(),
    filename: Vts.string(),
}, {
    description: 'Path params for /json/species/image/:id/:filename',
});

/**
 * Type of schema SpeciesImageGetRequest
 */
export type SpeciesImageGetRequest = ExtractSchemaResultType<typeof SchemaSpeciesImageGetRequest>;