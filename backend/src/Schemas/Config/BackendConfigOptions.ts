import {SchemaConfigBackendOptions} from 'figtree';
import {ExtractSchemaResultType, Vts} from 'vts';

export const SchemaBackendConfigOptions = SchemaConfigBackendOptions.extend({
    datadir: Vts.or([Vts.string(), Vts.null()])
});

export type BackendConfigOptions = ExtractSchemaResultType<typeof SchemaBackendConfigOptions>;