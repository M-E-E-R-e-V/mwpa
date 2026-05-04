import * as bcrypt from 'bcrypt';
import {Logger} from 'figtree';
import {Vts} from 'vts';
import {LoginResponse, MobileLoginRequest} from 'mwpa_schemas';
import {Devices as DevicesDB} from '../../../Db/MariaDb/Entities/Devices.js';
import {DevicesRepository} from '../../../Db/MariaDb/Repositories/DevicesRepository.js';
import {GroupRepository} from '../../../Db/MariaDb/Repositories/GroupRepository.js';
import {UserGroupsRepository} from '../../../Db/MariaDb/Repositories/UserGroupsRepository.js';
import {UserRepository} from '../../../Db/MariaDb/Repositories/UserRepository.js';

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
    public static async login(body: MobileLoginRequest | undefined, session: MobileLoginSession): Promise<LoginResponse> {
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
            role: ''
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
            Logger.getLogger().info(`Mobile login failed: wrong password by email: ${body.email}`);
            return {success: false, error: 'Wrong password!'};
        }

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

        session.user = {
            userid: user.id,
            isLogin: true,
            isAdmin: user.isAdmin,
            isMobileLogin: true,
            deviceIdentity: body.deviceIdentity,
            main_group_id: user.main_groupid,
            main_organization_id: mainOrganizationId,
            groups,
            organizations,
            role: ''
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