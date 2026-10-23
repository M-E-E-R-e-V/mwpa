import * as bcrypt from 'bcrypt';
import {Logger} from '@stefanwerfling/figtree';
import {Vts} from 'vts';
import {LoginResponse, MobileLoginRequest} from 'mwpa_schemas';
import {Devices as DevicesDB} from '../../../Db/MariaDb/Entities/Devices.js';
import {DevicesRepository} from '../../../Db/MariaDb/Repositories/DevicesRepository.js';
import {GroupRepository} from '../../../Db/MariaDb/Repositories/GroupRepository.js';
import {UserGroupsRepository} from '../../../Db/MariaDb/Repositories/UserGroupsRepository.js';
import {UserRepository} from '../../../Db/MariaDb/Repositories/UserRepository.js';
import {LoginLockoutRegistry} from '../../../Application/LoginLockoutRegistry.js';
import {resolveSessionRolesAndRights} from '../../SessionRights.js';

/**
 * Session shape the mobile-login handler updates. Mirrors MWPASessionData.user from schemas.
 */
export type MobileLoginSession = {
    user?: {
        userid: number;
        isLogin: boolean;
        isAdmin: boolean;
        isMobileLogin: boolean;
        deviceIdentity?: string;
        main_group_id: number;
        main_organization_id: number;
        groups: number[];
        organizations: number[];
        role?: string;
        rights?: string[];
    };
};

/**
 * MobileLogin
 */
export class MobileLogin {

    /**
     * Authenticate a mobile client.
     * Tries the password first; on mismatch it tries the user's PIN — but only when the
     * device is already known for that user (a PIN by itself is not enough on a new device).
     * On success the session is populated and a Devices row for {identity, user} is upserted.
     * @param {MobileLoginRequest} body
     * @param {MobileLoginSession} session
     * @return {LoginResponse}
     */
    public static async login(
        body: MobileLoginRequest | undefined,
        session: MobileLoginSession,
        userAgent: string = ''
    ): Promise<LoginResponse> {
        if (Vts.isUndefined(body)) {
            return {
                success: false,
                error: 'Request incomplete'
            };
        }

        if (body.email === '') {
            return {success: false, error: 'Email is empty!'};
        }

        if (body.password === '') {
            return {success: false, error: 'Password is empty!'};
        }

        // Per-(account, device) lockout on top of the per-IP rate limit — stops
        // a short PIN being brute-forced from one device even within the IP
        // budget. Checked before any credential comparison.
        const lockout = LoginLockoutRegistry.getInstance();

        if (lockout.isLocked(body.email, body.deviceIdentity)) {
            const minutes = Math.ceil(lockout.lockRemainingMs(body.email, body.deviceIdentity) / 60000);
            Logger.getLogger().warn(`Mobile login blocked (locked) for email: ${body.email}`);
            return {success: false, error: `Too many failed attempts. Try again in ${minutes} min.`};
        }

        // start with logged-out session
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

        const user = await UserRepository.getInstance().getUserByEMail(body.email, false);

        if (user === null) {
            return {success: false, error: 'User not found.'};
        }

        const passwordOk = await bcrypt.compare(body.password, user.password);
        let pinOk = false;

        if (!passwordOk) {
            const knownDevice = await DevicesRepository.getInstance().findByIdentityAndUser(body.deviceIdentity, user.id);

            if (knownDevice) {
                pinOk = await bcrypt.compare(body.password, user.pin);
            }
        }

        if (!passwordOk && !pinOk) {
            lockout.recordFailure(body.email, body.deviceIdentity, userAgent);
            Logger.getLogger().info(`Mobile login failed: wrong password by email: ${body.email}`);
            return {success: false, error: 'Wrong password!'};
        }

        // Successful credential check — clear any accrued failures/lock.
        lockout.reset(body.email, body.deviceIdentity);

        // gather group + organization ids
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

        // upsert Devices row
        const ctime = Math.floor(Date.now() / 1000);
        let device = await DevicesRepository.getInstance().findByIdentityAndUser(body.deviceIdentity, user.id);

        if (device === null) {
            device = new DevicesDB();
            device.identity = body.deviceIdentity;
            device.create_datetime = ctime;
            device.user_id = user.id;
            device.description = '';
        }

        device.update_datetime = ctime;
        if (device.description === '') {
            device.description = body.deviceDescription;
        }

        await DevicesRepository.getInstance().save(device);

        return {success: true, error: ''};
    }

}