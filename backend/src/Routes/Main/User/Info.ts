import {StatusCodes} from 'figtree-schemas';
import {UserInfo, UserInfoResponse} from 'mwpa_schemas';
import {GroupRepository} from '../../../Db/MariaDb/Repositories/GroupRepository.js';
import {OrganizationRepository} from '../../../Db/MariaDb/Repositories/OrganizationRepository.js';
import {UserRepository} from '../../../Db/MariaDb/Repositories/UserRepository.js';

/**
 * Info
 */
export class Info {

    /**
     * Return profile data for the current session user (with main group + organization).
     * Falls back to islogin: false when the session has no userid.
     * @param {number} userId
     * @return {UserInfoResponse}
     */
    public static async getInfo(userId: number): Promise<UserInfoResponse> {
        const notLoggedIn: UserInfoResponse = {
            statusCode: StatusCodes.OK,
            data: {
                islogin: false
            }
        };

        if (userId === 0) {
            return notLoggedIn;
        }

        const user = await UserRepository.getInstance().findOne(userId);

        if (!user) {
            return notLoggedIn;
        }

        const data: UserInfo = {
            islogin: true,
            user: {
                id: user.id,
                username: user.username,
                fullname: user.full_name,
                email: user.email,
                isAdmin: user.isAdmin
            }
        };

        const mainGroup = await GroupRepository.getInstance().findOne(user.main_groupid);

        if (mainGroup) {
            data.group = {
                id: mainGroup.id,
                name: mainGroup.description
            };

            const org = await OrganizationRepository.getInstance().findOne(mainGroup.organization_id);

            if (org) {
                data.organization = {
                    id: org.id,
                    name: org.description,
                    lat: org.lat,
                    lon: org.lon
                };
            }
        }

        return {
            statusCode: StatusCodes.OK,
            data
        };
    }

}