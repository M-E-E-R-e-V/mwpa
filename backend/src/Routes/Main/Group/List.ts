import {StatusCodes} from 'figtree';
import {GroupEntry, GroupListResponse, GroupOrganization} from 'mwpa_schemas';
import {GroupRepository} from '../../../Db/MariaDb/Repositories/GroupRepository.js';
import {OrganizationRepository} from '../../../Db/MariaDb/Repositories/OrganizationRepository.js';

/**
 * List
 */
export class List {

    /**
     * Return a list of group
     * @return {GroupListResponse}
     */
    public static async getList(): Promise<GroupListResponse> {
        const list: GroupEntry[] = [];
        const organizationMap = new Map<number, GroupOrganization>();

        const groups = await GroupRepository.getInstance().findAll();

        for await (const group of groups) {
            if (!organizationMap.has(group.organization_id)) {
                const org = await OrganizationRepository.getInstance().findOne(group.organization_id);

                if (org) {
                    organizationMap.set(org.id, {
                        id: org.id,
                        name: org.description,
                        country: org.country,
                        lat: org.lat,
                        lon: org.lon,
                        location: org.location
                    });
                }
            }

            // ---------------------------------------------------------------------------------------------------------

            list.push({
                id: group.id,
                role: group.role,
                organization_id: group.organization_id,
                description: group.description
            });
        }

        return {
            statusCode: StatusCodes.OK,
            list: list,
            organizationList: Array.from(organizationMap.values())
        };
    }

}