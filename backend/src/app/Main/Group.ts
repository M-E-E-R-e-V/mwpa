import {Get, JsonController, Session} from 'routing-controllers';
import {Group as GroupDB} from '../../inc/Db/MariaDb/Entity/Group';
import {Organization as OrganizationDB} from '../../inc/Db/MariaDb/Entity/Organization';
import {MariaDbHelper} from '../../inc/Db/MariaDb/MariaDbHelper';
import {DefaultReturn} from '../../inc/Routes/DefaultReturn';
import {StatusCodes} from '../../inc/Routes/StatusCodes';

/**
 * GroupEntry
 */
export type GroupEntry = {
    id: number;
    role: string;
    organization_id: number;
    description: string;
};

/**
 * Group Organization
 */
export type GroupOrganization = {
    id: number;
    name: string;
    location: string;
    lat: string;
    lon: string;
    country: string;
};

/**
 * GroupListResponse
 */
export type GroupListResponse = DefaultReturn & {
    list?: GroupEntry[];
    organizationList?: GroupOrganization[];
};

/**
 * Group JSON API
 */
@JsonController()
export class Group {

    /**
     * getList
     * @param session
     */
    @Get('/json/group/list')
    public async getList(@Session() session: any): Promise<GroupListResponse> {
        if ((session.user !== undefined) && session.user.isLogin) {
            const groupRepository = MariaDbHelper.getConnection().getRepository(GroupDB);
            const orgRepository = MariaDbHelper.getConnection().getRepository(OrganizationDB);

            const list: GroupEntry[] = [];
            const organizationMap = new Map<number, GroupOrganization>();

            const groups = await groupRepository.find();

            for (const group of groups) {
                if (!organizationMap.has(group.organization_id)) {
                    const org = await orgRepository.findOne({
                        where: {
                            id: group.organization_id
                        }
                    });

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

                list.push({
                    id: group.id,
                    role: group.role,
                    organization_id: group.organization_id,
                    description: group.description
                });
            }

            return {
                statusCode: StatusCodes.OK,
                list,
                organizationList: Array.from(organizationMap.values())
            };
        }

        return {
            statusCode: StatusCodes.UNAUTHORIZED
        };
    }

}