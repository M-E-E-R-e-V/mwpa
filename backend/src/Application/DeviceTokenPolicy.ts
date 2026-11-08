import * as crypto from 'crypto';

/**
 * Stored state of a device token, as far as the policy needs it.
 */
export type DeviceTokenState = {
    device_identity: string;
    last_used_datetime: number;
    revoked_datetime: number;
};

/**
 * Result of a device token check: 'ok' or why it is refused.
 */
export type DeviceTokenCheck = 'ok' | 'unknown' | 'revoked' | 'expired' | 'device';

/**
 * DeviceTokenPolicy - device tokens of Quick Connect devices (password
 * replacement for /mobile/login/token): generation, hashing and validity.
 * Pure functions, no DB access.
 */
export class DeviceTokenPolicy {

    /**
     * A token expires when it was not used for 180 days; every login with it
     * moves the expiry.
     */
    public static readonly IDLE_TTL_SEC = 180 * 24 * 60 * 60;

    /**
     * Random bytes of a token (256 bit).
     */
    public static readonly TOKEN_BYTES = 32;

    /**
     * New token: plaintext for the app (sent once) and its hash for the DB.
     */
    public static generate(): {token: string; hash: string} {
        const token = crypto.randomBytes(DeviceTokenPolicy.TOKEN_BYTES).toString('base64url');

        return {
            token: token,
            hash: DeviceTokenPolicy.hash(token)
        };
    }

    /**
     * sha256 hex of a token (the DB stores only this).
     */
    public static hash(token: string): string {
        return crypto.createHash('sha256').update(token).digest('hex');
    }

    /**
     * Check a stored token for a login of deviceIdentity at nowEpochSec.
     */
    public static check(
        row: DeviceTokenState | null,
        deviceIdentity: string,
        nowEpochSec: number
    ): DeviceTokenCheck {
        if (row === null) {
            return 'unknown';
        }

        if (row.revoked_datetime > 0) {
            return 'revoked';
        }

        if (row.device_identity !== deviceIdentity) {
            return 'device';
        }

        if (row.last_used_datetime + DeviceTokenPolicy.IDLE_TTL_SEC <= nowEpochSec) {
            return 'expired';
        }

        return 'ok';
    }

}
