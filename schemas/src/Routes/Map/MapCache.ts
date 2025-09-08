import {ExtractSchemaResultType, Vts} from 'vts';

/**
 * Schema of MapCacheRequest
 * Path variables for map cache call
 */
export const SchemaMapCacheRequest = Vts.object({
    server: Vts.string({description: 'Server name for request'}),
    z: Vts.string(),
    x: Vts.string(),
    y: Vts.string(),
    fileformat: Vts.string(),
}, {
    description: 'Path variables for map cache call',
});

/**
 * Type of schema MapCacheRequest
 */
export type MapCacheRequest = ExtractSchemaResultType<typeof SchemaMapCacheRequest>;