import {ExtractSchemaResultType, Vts} from 'vts';
import {SchemaDefaultReturn} from 'figtree-schemas';

/**
 * Schema of QuickConnectPayload
 * Payload encoded into the Quick Connect QR code. The Flutter app parses this JSON after scanning and sends {otp} back to /mobile/quickconnect together with its device identity.
 */
export const SchemaQuickConnectPayload = Vts.object({
    version: Vts.number({description: 'Payload version. Bump when the wire shape changes so the app can refuse incompatible QR codes.'}),
    server: Vts.string({description: 'Public base URL of the MWPA backend (scheme + host). Determined from X-Forwarded-* via Express trust proxy.'}),
    username: Vts.string({description: 'Username (display only - not required for the exchange, the OTP is sufficient).'}),
    otp: Vts.string({description: 'Single-use Quick Connect OTP (hex). Valid for ~60s, consumed by the first /mobile/quickconnect call.'}),
    expires_at: Vts.number({description: 'Absolute expiry as unix epoch ms - so the app can show a countdown without relying on its clock-of-issue.'}),
}, {
    description: 'Payload encoded into the Quick Connect QR code. The Flutter app parses this JSON after scanning and sends {otp} back to /mobile/quickconnect together with its device identity.',
});

/**
 * Type of schema QuickConnectPayload
 */
export type QuickConnectPayload = ExtractSchemaResultType<typeof SchemaQuickConnectPayload>;

/**
 * Schema of QuickConnectGenerateResponse
 * Response of POST /json/quickconnect/generate. data is set on success.
 */
export const SchemaQuickConnectGenerateResponse = SchemaDefaultReturn.extend({
    data: Vts.optional(SchemaQuickConnectPayload),
}, {
    description: 'Response of POST /json/quickconnect/generate. data is set on success.',
});

/**
 * Type of schema QuickConnectGenerateResponse
 */
export type QuickConnectGenerateResponse = ExtractSchemaResultType<typeof SchemaQuickConnectGenerateResponse>;