import {ExtractSchemaResultType, Vts} from 'vts';

export const SchemaMapCacheRequest = Vts.object({
    server: Vts.string({description: 'Server name for request'}),
    z: Vts.string({description: ''}),
    x: Vts.string({description: ''}),
    y: Vts.string({description: ''}),
    fileformat: Vts.string({description: ''})
}, {description: 'Path variables for map cache call'});

export type MapCacheRequest = ExtractSchemaResultType<typeof SchemaMapCacheRequest>;