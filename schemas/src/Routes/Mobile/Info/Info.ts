import {ExtractSchemaResultType, Vts} from 'vts';
import {SchemaDefaultMobileV1Return} from '../Base/DefaultMobileV1Return.js';

/**
 * Schema of InfoResponse
 */
export const SchemaInfoResponse = SchemaDefaultMobileV1Return.extend({
    version_api_login: Vts.optional(Vts.string()),
    version_api_sync: Vts.optional(Vts.string()),
}, {
    description: '',
});

/**
 * Type of schema InfoResponse
 */
export type InfoResponse = ExtractSchemaResultType<typeof SchemaInfoResponse>;