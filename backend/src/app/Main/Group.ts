import {Get, JsonController, Session} from 'routing-controllers';
import {Group as GroupDB} from '../../inc/Db/MariaDb/Entity/Group';
import {MariaDbHelper} from '../../inc/Db/MariaDb/MariaDbHelper';
import {DefaultReturn} from '../../inc/Routes/DefaultReturn';
import {StatusCodes} from '../../inc/Routes/StatusCodes';

/**
 * GroupEntry
 */
export type GroupEntry = {
    id: number;
    name: string;
};

/**
 * GroupListResponse
 */
export type GroupListResponse = DefaultReturn & {
    list?: GroupEntry[];
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
            const list: GroupEntry[] = [];

            const groups = await groupRepository.find();

            for (const group of groups) {
                list.push({
                    id: group.id,
                    name: group.description
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