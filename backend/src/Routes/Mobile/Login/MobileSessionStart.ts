import {Devices as DevicesDB} from '../../../Db/MariaDb/Entities/Devices.js';
import {User} from '../../../Db/MariaDb/Entities/User.js';
import {DevicesRepository} from '../../../Db/MariaDb/Repositories/DevicesRepository.js';
import {GroupRepository} from '../../../Db/MariaDb/Repositories/GroupRepository.js';
import {UserGroupsRepository} from '../../../Db/MariaDb/Repositories/UserGroupsRepository.js';
import {resolveSessionRolesAndRights} from '../../SessionRights.js';
import {MobileLoginSession} from './MobileLogin.js';

/**
 * MobileSessionStart - logs an already authenticated user into the mobile
 * session (groups, organizations, role/rights) and upserts the Devices row.
 * Same shape as MobileLogin#login; used by Quick Connect and the device
 * token login.
 */
export class MobileSessionStart {

    public static async start(
        user: User,
        deviceIdentity: string,
        deviceDescription: string,
        session: MobileLoginSession,
        nowEpochSec: number
    ): Promise<void> {
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
            deviceIdentity: deviceIdentity,
            main_group_id: user.main_groupid,
            main_organization_id: mainOrganizationId,
            groups: groups,
            organizations: organizations,
            role: role,
            rights: rights
        };

        // Devices upsert — same as MobileLogin so PIN-on-known-device logins
        // keep working from the same handset.
        let device = await DevicesRepository.getInstance().findByIdentityAndUser(deviceIdentity, user.id);

        if (device === null) {
            device = new DevicesDB();
            device.identity = deviceIdentity;
            device.create_datetime = nowEpochSec;
            device.user_id = user.id;
            device.description = '';
        }

        device.update_datetime = nowEpochSec;

        if (device.description === '') {
            device.description = deviceDescription;
        }

        await DevicesRepository.getInstance().save(device);
    }

    /**
     * Logged-out mobile session (set before any credential check).
     */
    public static reset(session: MobileLoginSession): void {
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
    }

}
