import * as crypto from 'crypto';
import {Logger} from '@stefanwerfling/figtree';
import {Vts} from 'vts';
import {MobileQuickConnectRequest, MobileQuickConnectResponse} from 'mwpa_schemas';
import {DeviceTokenPolicy} from '../../../Application/DeviceTokenPolicy.js';
import {UserDeviceToken} from '../../../Db/MariaDb/Entities/UserDeviceToken.js';
import {UserDeviceTokenRepository} from '../../../Db/MariaDb/Repositories/UserDeviceTokenRepository.js';
import {UserQuickConnectTokenRepository} from '../../../Db/MariaDb/Repositories/UserQuickConnectTokenRepository.js';
import {UserRepository} from '../../../Db/MariaDb/Repositories/UserRepository.js';
import {MobileLoginSession} from '../Login/MobileLogin.js';
import {MobileSessionStart} from '../Login/MobileSessionStart.js';

/**
 * MobileQuickConnect — exchange a Quick Connect OTP for a mobile session and
 * a device token (password replacement for /mobile/login/token).
 *
 * Mirrors {@link MobileLogin#login}: same session shape, same Devices upsert,
 * same role/rights resolution. The only difference is that the user is
 * identified by a single-use OTP (issued by /json/quickconnect/generate) instead
 * of an email/password pair, so the bcrypt step is skipped.
 */
export class MobileQuickConnect {

    public static async exchange(
        body: MobileQuickConnectRequest | undefined,
        session: MobileLoginSession
    ): Promise<MobileQuickConnectResponse> {
        if (Vts.isUndefined(body)) {
            return {success: false, error: 'Request incomplete'};
        }

        if (body.otp === '') {
            return {success: false, error: 'OTP is empty!'};
        }

        if (body.deviceIdentity === '') {
            return {success: false, error: 'Device identity is empty!'};
        }

        // reset to logged-out state up-front, identical to MobileLogin.login
        MobileSessionStart.reset(session);

        const nowSec = Math.floor(Date.now() / 1000);
        const tokenHash = crypto.createHash('sha256').update(body.otp).digest('hex');
        const token = await UserQuickConnectTokenRepository.getInstance().findUnusedByHash(tokenHash, nowSec);

        if (token === null) {
            Logger.getLogger().info('QuickConnect exchange: invalid or expired OTP');
            return {success: false, error: 'Invalid or expired OTP.'};
        }

        // Single-use: race-safe consume. If another request beat us to it, treat as invalid.
        const consumed = await UserQuickConnectTokenRepository.getInstance().markUsed(token.id, nowSec);

        if (!consumed) {
            Logger.getLogger().info(`QuickConnect exchange: OTP already consumed (token ${token.id})`);
            return {success: false, error: 'Invalid or expired OTP.'};
        }

        const user = await UserRepository.getInstance().findOne(token.user_id);

        if (user === null || user.disable) {
            return {success: false, error: 'User not found or disabled.'};
        }

        await MobileSessionStart.start(user, body.deviceIdentity, body.deviceDescription, session, nowSec);

        // device token: replaces the password for later logins of this
        // device (/mobile/login/token); one valid token per user + device
        const tokens = UserDeviceTokenRepository.getInstance();
        const {token: deviceToken, hash} = DeviceTokenPolicy.generate();

        await tokens.revokeForDevice(user.id, body.deviceIdentity, nowSec);
        await tokens.deleteStale(nowSec - DeviceTokenPolicy.IDLE_TTL_SEC);

        const row = new UserDeviceToken();
        row.user_id = user.id;
        row.device_identity = body.deviceIdentity;
        row.token_hash = hash;
        row.create_datetime = nowSec;
        row.last_used_datetime = nowSec;
        row.revoked_datetime = 0;

        await tokens.save(row);

        Logger.getLogger().info(`QuickConnect exchange: user ${user.id} logged in via OTP`);

        return {success: true, error: '', device_token: deviceToken};
    }

}