import {ExtractSchemaResultType, Vts} from 'vts';
import {SchemaConfigBackendOptions} from 'figtree';

/**
 * Schema of BackendConfigOptions
 */
export const SchemaBackendConfigOptions = SchemaConfigBackendOptions.extend({
    datadir: Vts.or([Vts.string(), Vts.null()]),
}, {
    description: '',
});

/**
 * Type of schema BackendConfigOptions
 */
export type BackendConfigOptions = ExtractSchemaResultType<typeof SchemaBackendConfigOptions>;