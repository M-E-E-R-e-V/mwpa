import {ExtractSchemaResultType, Vts} from 'vts';

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