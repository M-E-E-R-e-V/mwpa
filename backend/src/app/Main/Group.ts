import {Body, Get, JsonController, Post, Session} from 'routing-controllers';
import {Group as GroupDB} from '../../Db/MariaDb/Entities/Group.js';
import {Organization as OrganizationDB} from '../../Db/MariaDb/Entities/Organization.js';
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

    /**
     * Save Organization
     * @param session
     * @param req
     */
    @Post('/json/group/save')
    public async saveGroup(@Session() session: any, @Body() req: GroupEntry): Promise<DefaultReturn> {
        if ((session.user !== undefined) && session.user.isLogin) {
            if (!session.user.isAdmin) {
                return {
                    statusCode: StatusCodes.FORBIDDEN
                };
            }

            const groupRepository = MariaDbHelper.getConnection().getRepository(GroupDB);
            let group: GroupDB|null = null;

            if (req.id !== 0) {
                const tgroup = await groupRepository.findOne({
                    where: {
                        id: req.id
                    }
                });

                if (tgroup) {
                    group = tgroup;
                }
            }

            if (group === null) {
                group = new GroupDB();
            }

            group.description = req.description;
            group.role = req.role;
            group.organization_id = req.organization_id;

            await groupRepository.save(group);

            return {
                statusCode: StatusCodes.OK
            };
        }

        return {
            statusCode: StatusCodes.UNAUTHORIZED
        };
    }

}