import * as crypto from 'crypto';
import {Logger} from 'figtree';
import {Vts} from 'vts';
import {LoginResponse, MobileQuickConnectRequest} from 'mwpa_schemas';
import {Devices as DevicesDB} from '../../../Db/MariaDb/Entities/Devices.js';
import {DevicesRepository} from '../../../Db/MariaDb/Repositories/DevicesRepository.js';
import {GroupRepository} from '../../../Db/MariaDb/Repositories/GroupRepository.js';
import {UserGroupsRepository} from '../../../Db/MariaDb/Repositories/UserGroupsRepository.js';
import {UserQuickConnectTokenRepository} from '../../../Db/MariaDb/Repositories/UserQuickConnectTokenRepository.js';
import {UserRepository} from '../../../Db/MariaDb/Repositories/UserRepository.js';
import {MobileLoginSession} from '../Login/MobileLogin.js';
import {resolveSessionRolesAndRights} from '../../SessionRights.js';

/**
 * MobileQuickConnect — exchange a Quick Connect OTP for a mobile session.
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
    ): Promise<LoginResponse> {
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
        session.user = {
            userid: 0,
            isLogin: false,
            isAdmin: false,
            isMobileLogin: true,
            deviceIdentity: '',
            main_group_id: 0,
            main_organization_id: 0,
            groups: [],
            organizations: [],
            role: '',
            rights: []
        };

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

        const groups: number[] = [];
        const organizations: number[] = [];
        let mainOrganizationId = 0;

        const mainGroup = await GroupRepository.getInstance().findOne(user.main_groupid);
        if (mainGroup) {
            groups.push(mainGroup.id);
            organizations.push(mainGroup.organization_id);
            mainOrganizationId = mainGroup.organization_id;
        }

        const userGroups = await UserGroupsRepository.getInstance().findAllBy(user.id);
        for (const userGroup of userGroups) {
            if (groups.indexOf(userGroup.group_id) === -1) {
                const subGroup = await GroupRepository.getInstance().findOne(userGroup.group_id);
                if (subGroup) {
                    groups.push(subGroup.id);
                    organizations.push(subGroup.organization_id);
                }
            }
        }

        const {role, rights} = await resolveSessionRolesAndRights(groups, user.isAdmin);

        session.user = {
            userid: user.id,
            isLogin: true,
            isAdmin: user.isAdmin,
            isMobileLogin: true,
            deviceIdentity: body.deviceIdentity,
            main_group_id: user.main_groupid,
            main_organization_id: mainOrganizationId,
            groups: groups,
            organizations: organizations,
            role: role,
            rights: rights
        };

        // Devices upsert — same as MobileLogin so subsequent PIN-on-known-device
        // logins keep working from the same handset.
        let device = await DevicesRepository.getInstance().findByIdentityAndUser(body.deviceIdentity, user.id);

        if (device === null) {
            device = new DevicesDB();
            device.identity = body.deviceIdentity;
            device.create_datetime = nowSec;
            device.user_id = user.id;
            device.description = '';
        }

        device.update_datetime = nowSec;
        if (device.description === '') {
            device.description = body.deviceDescription;
        }

        await DevicesRepository.getInstance().save(device);

        Logger.getLogger().info(`QuickConnect exchange: user ${user.id} logged in via OTP`);

        return {success: true, error: ''};
    }

}