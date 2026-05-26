import {QuickConnectPayload} from 'mwpa_schemas';
import {NetFetch} from '../Net/NetFetch';

/**
 * QuickConnect
 *
 * Wrapper around POST /json/quickconnect/generate. The Modal displays the
 * returned payload as a QR code; the Flutter app scans it and exchanges the
 * embedded otp for a session via /mobile/quickconnect.
 */
export class QuickConnect {

    /**
     * Request a single-use Quick Connect OTP for the current session.
     * @return {QuickConnectPayload} server, username, otp and absolute expiry.
     * @throws on any non-OK statusCode (caller surfaces via DialogError).
     */
    public static async generate(): Promise<QuickConnectPayload> {
        const response = await NetFetch.postData('/json/quickconnect/generate', {});

        if (response && response.statusCode === '200' && response.data) {
            return response.data as QuickConnectPayload;
        }

        const msg = response?.msg ?? 'Quick Connect request failed.';
        throw new Error(msg);
    }

}