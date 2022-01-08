import {Get, JsonController, Session} from 'routing-controllers';

/**
 * UserInfo
 */
export type UserInfo = {
    islogin: boolean;
};

/**
 * UserInfoResponse
 */
export type UserInfoResponse = {
    status: string;
    msg?: string;
    data?: UserInfo;
};

/**
 * User JSON API
 */
@JsonController()
export class User {

    /**
     * islogin
     * @param session
     */
    @Get('/json/user/info')
    public async getUserInfo(@Session() session: any): Promise<UserInfoResponse> {

    }

}