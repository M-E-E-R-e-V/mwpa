import {Logger} from '@stefanwerfling/figtree';
import {Vts} from 'vts';
import {LoginResponse, MobileTokenLoginRequest, MobileTokenLogoutRequest} from 'mwpa_schemas';
import {DeviceTokenPolicy} from '../../../Application/DeviceTokenPolicy.js';
import {LoginLockoutRegistry} from '../../../Application/LoginLockoutRegistry.js';
import {UserDeviceTokenRepository} from '../../../Db/MariaDb/Repositories/UserDeviceTokenRepository.js';
import {UserRepository} from '../../../Db/MariaDb/Repositories/UserRepository.js';
import {MobileLoginSession} from '../Login/MobileLogin.js';
import {MobileSessionStart} from '../Login/MobileSessionStart.js';

/**
 * MobileDeviceToken — login and logout of Quick Connect devices with their
 * device token (issued by /mobile/quickconnect) instead of a password.
 * The password login (/mobile/login) is not affected.
 */
export class MobileDeviceToken {

    /**
     * Lockout key: failures are counted per device like the password login,
     * under a fixed pseudo account (the token itself identifies the user).
     */
    public static readonly LOCKOUT_ACCOUNT = 'device-token';

    /**
     * POST /mobile/login/token
     */
    public static async login(
        body: MobileTokenLoginRequest | undefined,
        session: MobileLoginSession,
        userAgent: string = ''
    ): Promise<LoginResponse> {
        if (Vts.isUndefined(body)) {
            return {success: false, error: 'Request incomplete'};
        }

        if (body.token === '') {
            return {success: false, error: 'Token is empty!'};
        }

        if (body.deviceIdentity === '') {
            return {success: false, error: 'Device identity is empty!'};
        }

        const lockout = LoginLockoutRegistry.getInstance();
        const lockAccount = MobileDeviceToken.LOCKOUT_ACCOUNT;

        if (lockout.isLocked(lockAccount, body.deviceIdentity)) {
            const minutes = Math.ceil(lockout.lockRemainingMs(lockAccount, body.deviceIdentity) / 60000);
            Logger.getLogger().warn('Mobile token login blocked (locked) for a device');
            return {success: false, error: `Too many failed attempts. Try again in ${minutes} min.`};
        }

        MobileSessionStart.reset(session);

        const nowSec = Math.floor(Date.now() / 1000);
        const tokens = UserDeviceTokenRepository.getInstance();
        const row = await tokens.findByHash(DeviceTokenPolicy.hash(body.token));
        const check = DeviceTokenPolicy.check(row, body.deviceIdentity, nowSec);

        if (row === null || check !== 'ok') {
            lockout.recordFailure(lockAccount, body.deviceIdentity, userAgent);
            Logger.getLogger().info(`Mobile token login refused: ${check}`);
            return {success: false, error: 'Invalid or expired device token, please connect again.'};
        }

        const user = await UserRepository.getInstance().findOne(row.user_id);

        if (user === null || user.disable) {
            return {success: false, error: 'User not found or disabled.'};
        }

        lockout.reset(lockAccount, body.deviceIdentity);

        await MobileSessionStart.start(user, body.deviceIdentity, body.deviceDescription, session, nowSec);
        await tokens.touch(row.id, nowSec);

        Logger.getLogger().info(`Mobile token login: user ${user.id}`);

        return {success: true, error: ''};
    }

    /**
     * POST /mobile/logout/token — revokes the token of this device (app
     * logout). Answers success also for an unknown token, so a stale app
     * state can always log out.
     */
    public static async logout(body: MobileTokenLogoutRequest | undefined): Promise<LoginResponse> {
        if (Vts.isUndefined(body) || body.token === '') {
            return {success: false, error: 'Request incomplete'};
        }

        const nowSec = Math.floor(Date.now() / 1000);
        const tokens = UserDeviceTokenRepository.getInstance();
        const row = await tokens.findByHash(DeviceTokenPolicy.hash(body.token));

        if (row !== null && row.device_identity === body.deviceIdentity) {
            await tokens.revokeForDevice(row.user_id, row.device_identity, nowSec);
            Logger.getLogger().info(`Mobile token logout: user ${row.user_id}`);
        }

        return {success: true, error: ''};
    }

}
