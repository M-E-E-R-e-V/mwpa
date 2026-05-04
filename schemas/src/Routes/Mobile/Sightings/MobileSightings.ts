import {ExtractSchemaResultType, Vts} from 'vts';
import {SchemaDefaultMobileV1Return} from '../Base/DefaultMobileV1Return.js';

/**
 * Schema of SightingSaveResponse
 */
export const SchemaSightingSaveResponse = SchemaDefaultMobileV1Return.extend({
    unid: Vts.optional(Vts.string()),
    canDelete: Vts.optional(Vts.boolean()),
}, {
    description: '',
});

/**
 * Type of schema SightingSaveResponse
 */
export type SightingSaveResponse = ExtractSchemaResultType<typeof SchemaSightingSaveResponse>;

/**
 * Schema of SightingImageExistRequest
 */
export const SchemaSightingImageExistRequest = Vts.object({
    unid: Vts.string(),
    filename: Vts.string(),
    size: Vts.string({description: 'Mobile sends file size as string (toString()) for compat with the production Dart client.'}),
}, {
    description: '',
});

/**
 * Type of schema SightingImageExistRequest
 */
export type SightingImageExistRequest = ExtractSchemaResultType<typeof SchemaSightingImageExistRequest>;

/**
 * Schema of SightingImageExistResponse
 */
export const SchemaSightingImageExistResponse = SchemaDefaultMobileV1Return.extend({
    isExist: Vts.optional(Vts.boolean()),
}, {
    description: '',
});

/**
 * Type of schema SightingImageExistResponse
 */
export type SightingImageExistResponse = ExtractSchemaResultType<typeof SchemaSightingImageExistResponse>;

/**
 * Schema of SightingImageSaveRequest
 * Multipart fields for /mobile/sighting/image/save (file upload)
 */
export const SchemaSightingImageSaveRequest = Vts.object({
    unid: Vts.string(),
    filename: Vts.string(),
    size: Vts.string(),
}, {
    description: 'Multipart fields for /mobile/sighting/image/save (file upload)',
});

/**
 * Type of schema SightingImageSaveRequest
 */
export type SightingImageSaveRequest = ExtractSchemaResultType<typeof SchemaSightingImageSaveRequest>;