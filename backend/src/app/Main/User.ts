import {Get, JsonController, Session} from 'routing-controllers';
import {User as UserDB} from '../../inc/Db/MariaDb/Entity/User';
import {MariaDbHelper} from '../../inc/Db/MariaDb/MariaDbHelper';
import {DefaultReturn} from '../../inc/Routes/DefaultReturn';
import {StatusCodes} from '../../inc/Routes/StatusCodes';

/**
 * UserData
 */
export type UserData = {
    id: number;
    username: string;
    email: string;
    isAdmin: boolean;
};

/**
 * UserInfo
 */
export type UserInfo = {
    islogin: boolean;
    user?: UserData;
};

/**
 * UserInfoResponse
 */
export type UserInfoResponse = DefaultReturn & {
    data?: UserInfo;
};

export type UserListResponse = DefaultReturn & {

};

/**
 * User JSON API
 */
@JsonController()
export class User {

    /**
     * getUserInfo
     * @param session
     */
    @Get('/json/user/info')
    public async getUserInfo(@Session() session: any): Promise<UserInfoResponse> {
        if ((session.user !== undefined) && session.user.isLogin) {
            const userRepository = MariaDbHelper.getConnection().getRepository(UserDB);

            const user = await userRepository.findOne({
                where: {
                    id: session.user.userid
                }
            });

            if (user) {
                return {
                    statusCode: StatusCodes.OK,
                    data: {
                        islogin: true,
                        user: {
                            id: user.id,
                            username: user.username,
                            email: user.email,
                            isAdmin: user.isAdmin
                        }
                    }
                };
            }
        }

        return {
            statusCode: StatusCodes.OK,
            data: {
                islogin: false
            }
        };
    }

    @Get('/json/user/list')
    public async getList(@Session() session: any): Promise<UserListResponse> {
        if ((session.user !== undefined) && session.user.isLogin) {
            if (!session.user.isAdmin) {
                return {
                    statusCode: StatusCodes.FORBIDDEN
                };
            }


        }

        return {
            statusCode: StatusCodes.UNAUTHORIZED
        };
    }

}