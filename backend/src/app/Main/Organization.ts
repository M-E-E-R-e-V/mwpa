import {Get, JsonController, Session} from 'routing-controllers';
import {Organization as OrganizationDB} from '../../inc/Db/MariaDb/Entity/Organization';
import {MariaDbHelper} from '../../inc/Db/MariaDb/MariaDbHelper';
import {DefaultReturn} from '../../inc/Routes/DefaultReturn';
import {StatusCodes} from '../../inc/Routes/StatusCodes';
import {Users} from '../../inc/Users/Users';

/**
 * OrganizationEntry
 */
export type OrganizationEntry = {
    id: number;
    description: string;
};

/**
 * OrganizationUserListResponse
 */
export type OrganizationUserListResponse = DefaultReturn & {
    list?: OrganizationEntry[];
};

/**
 * Organization
 */
@JsonController()
export class Organization {

    /**
     * getOrganizationByUser
     * @param session
     */
    @Get('/json/organization/userlist')
    public async getOrganizationByUser(@Session() session: any): Promise<OrganizationUserListResponse> {
        if ((session.user !== undefined) && session.user.isLogin) {
            let orgs: OrganizationDB[] = [];

            if (session.user.isAdmin) {
                const organizationRepository = MariaDbHelper.getConnection().getRepository(OrganizationDB);

                orgs = await organizationRepository.find();
            } else {
                orgs = await Users.getOrganizations(session.user.userid);
            }


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

        return {
            statusCode: StatusCodes.UNAUTHORIZED
        };
    }

}