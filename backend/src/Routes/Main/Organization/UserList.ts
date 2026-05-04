import {StatusCodes} from 'figtree-schemas';
import {OrganizationEntry, OrganizationUserListResponse} from 'mwpa_schemas';
import {OrganizationRepository} from '../../../Db/MariaDb/Repositories/OrganizationRepository.js';
import {Users} from '../../../Users/Users.js';

/**
 * UserList
 */
export class UserList {

    /**
     * Return organizations the session user belongs to. Admins see all.
     * @param {number} userId
     * @param {boolean} isAdmin
     * @return {OrganizationUserListResponse}
     */
    public static async getList(userId: number, isAdmin: boolean): Promise<OrganizationUserListResponse> {
        const orgs = isAdmin
            ? await OrganizationRepository.getInstance().findAll()
            : await Users.getOrganizations(userId);

        const list: OrganizationEntry[] = [];

        for (const org of orgs) {
            list.push({
                id: org.id,
                description: org.description
            });
        }

        return {
            statusCode: StatusCodes.OK,
            list
        };
    }

}