import {ExtractSchemaResultType, Vts} from 'vts';
import {SchemaLoginResponse} from '../../Base/Login/Login.js';

/**
 * Schema of MobileQuickConnectRequest
 * Body of POST /mobile/quickconnect. The app scans the QR, extracts the otp and posts it together with its device identity. The OTP alone identifies the user (single-use, ~60s TTL).
 */
export const SchemaMobileQuickConnectRequest = Vts.object({
    otp: Vts.string(),
    deviceIdentity: Vts.string(),
    deviceDescription: Vts.string(),
}, {
    description: 'Body of POST /mobile/quickconnect. The app scans the QR, extracts the otp and posts it together with its device identity. The OTP alone identifies the user (single-use, ~60s TTL).',
});

/**
 * Type of schema MobileQuickConnectRequest
 */
export type MobileQuickConnectRequest = ExtractSchemaResultType<typeof SchemaMobileQuickConnectRequest>;

/**
 * Schema of MobileQuickConnectResponse
 * Response of POST /mobile/quickconnect. Extends LoginResponse with an optional device token: a long-lived secret for this device that replaces the password for later logins via /mobile/login/token (servers before this field send no token).
 */
export const SchemaMobileQuickConnectResponse = SchemaLoginResponse.extend({
    device_token: Vts.optional(Vts.string({description: 'Device token (plaintext, only sent once); the server stores its sha256 hash.'})),
}, {
    description: 'Response of POST /mobile/quickconnect. Extends LoginResponse with an optional device token: a long-lived secret for this device that replaces the password for later logins via /mobile/login/token (servers before this field send no token).',
});

/**
 * Type of schema MobileQuickConnectResponse
 */
export type MobileQuickConnectResponse = ExtractSchemaResultType<typeof SchemaMobileQuickConnectResponse>;

/**
 * Schema of MobileTokenLoginRequest
 * Body of POST /mobile/login/token. Logs a device in with the device token it received from /mobile/quickconnect (password replacement for Quick Connect devices). The token is bound to the device identity.
 */
export const SchemaMobileTokenLoginRequest = Vts.object({
    token: Vts.string({description: 'Device token from /mobile/quickconnect.'}),
    deviceIdentity: Vts.string(),
    deviceDescription: Vts.string(),
}, {
    description: 'Body of POST /mobile/login/token. Logs a device in with the device token it received from /mobile/quickconnect (password replacement for Quick Connect devices). The token is bound to the device identity.',
});

/**
 * Type of schema MobileTokenLoginRequest
 */
export type MobileTokenLoginRequest = ExtractSchemaResultType<typeof SchemaMobileTokenLoginRequest>;

/**
 * Schema of MobileTokenLogoutRequest
 * Body of POST /mobile/logout/token. Revokes the device token of this device (app logout).
 */
export const SchemaMobileTokenLogoutRequest = Vts.object({
    token: Vts.string({description: 'Device token to revoke.'}),
    deviceIdentity: Vts.string(),
}, {
    description: 'Body of POST /mobile/logout/token. Revokes the device token of this device (app logout).',
});

/**
 * Type of schema MobileTokenLogoutRequest
 */
export type MobileTokenLogoutRequest = ExtractSchemaResultType<typeof SchemaMobileTokenLogoutRequest>;