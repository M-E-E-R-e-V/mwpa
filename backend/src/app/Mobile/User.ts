import {Get, JsonController, Session} from 'routing-controllers';
import {User as MainUser, UserInfoResponse} from '../Main/User';

/**
 * User JSON API
 */
@JsonController()
export class User extends MainUser {

    /**
     * getUserInfo
     * @param session
     */
    @Get('/mobile/user/info')
    public async getUserInfo(@Session() session: any): Promise<UserInfoResponse> {
        return super.getUserInfo(session);
    }

}