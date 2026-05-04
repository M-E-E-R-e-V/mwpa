import {ExtractSchemaResultType, Vts} from 'vts';
import {SchemaLoginRequest} from '../../Base/Login/Login.js';

/**
 * Schema of MobileLoginRequest
 * Extends LoginRequest (email, password) with mobile-specific deviceIdentity and deviceDescription
 */
export const SchemaMobileLoginRequest = SchemaLoginRequest.extend({
    deviceIdentity: Vts.string(),
    deviceDescription: Vts.string(),
}, {
    description: 'Extends LoginRequest (email, password) with mobile-specific deviceIdentity and deviceDescription',
});

/**
 * Type of schema MobileLoginRequest
 */
export type MobileLoginRequest = ExtractSchemaResultType<typeof SchemaMobileLoginRequest>;