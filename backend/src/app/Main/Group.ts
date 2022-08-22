import {Get, JsonController, Session} from 'routing-controllers';
import {DefaultReturn} from '../../inc/Routes/DefaultReturn';
import {StatusCodes} from '../../inc/Routes/StatusCodes';

/**
 * GroupListResponse
 */
export type GroupListResponse = DefaultReturn & {

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

        }

        return {
            statusCode: StatusCodes.UNAUTHORIZED
        };
    }

}