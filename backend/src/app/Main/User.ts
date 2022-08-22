import {Get, JsonController, Session} from 'routing-controllers';
import {User as UserDB} from '../../inc/Db/MariaDb/Entity/User';
import {MariaDbHelper} from '../../inc/Db/MariaDb/MariaDbHelper';
import {DefaultReturn} from '../../inc/Routes/DefaultReturn';
import {StatusCodes} from '../../inc/Routes/StatusCodes';

/**
 * UserInfoData
 */
export type UserInfoData = {
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
    user?: UserInfoData;
};

/**
 * UserInfoResponse
 */
export type UserInfoResponse = DefaultReturn & {
    data?: UserInfo;
};

/**
 * UserData
 */
export type UserData = UserInfoData & {
    full_name: string;
    main_groupid: number;
    password?: string;
    disable: boolean;
};

/**
 * UserListResponse
 */
export type UserListResponse = DefaultReturn & {
    list?: UserData[];
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

    /**
     * getList
     * @param session
     */
    @Get('/json/user/list')
    public async getList(@Session() session: any): Promise<UserListResponse> {
        if ((session.user !== undefined) && session.user.isLogin) {
            if (!session.user.isAdmin) {
                return {
                    statusCode: StatusCodes.FORBIDDEN
                };
            }

            const userRepository = MariaDbHelper.getConnection().getRepository(UserDB);
            const users = await userRepository.find();
            const list: UserData[] = [];

            for (const user of users) {
                list.push({
                    id: user.id,
                    username: user.username,
                    email: user.email,
                    isAdmin: user.isAdmin,
                    full_name: user.full_name,
                    main_groupid: user.main_groupid,
                    password: '',
                    disable: user.disable
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