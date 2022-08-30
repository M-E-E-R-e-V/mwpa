import * as bcrypt from 'bcrypt';
import {Body, Get, JsonController, Post, Session} from 'routing-controllers';
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
    fullname: string;
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
                            fullname: user.full_name,
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
                    fullname: user.full_name,
                    email: user.email,
                    isAdmin: user.isAdmin,
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

    /**
     * save
     * @param session
     * @param request
     */
    @Post('/json/user/save')
    public async save(@Session() session: any, @Body() request: UserData): Promise<DefaultReturn> {
        if ((session.user !== undefined) && session.user.isLogin) {
            if (!session.user.isAdmin) {
                return {
                    statusCode: StatusCodes.FORBIDDEN
                };
            }

            const userRepository = MariaDbHelper.getConnection().getRepository(UserDB);

            let auser: UserDB|null = null;

            if (request.id !== 0) {
                const tuser = await userRepository.findOne({
                    where: {
                        id: request.id
                    }
                });

                if (tuser) {
                    auser = tuser;
                }
            }

            if (auser === null) {
                auser = new UserDB();
            }

            auser.username = request.username;
            auser.full_name = request.fullname;
            auser.email = request.email;

            if (request.password !== '') {
                auser.password = await bcrypt.hash(request.password!, 10);
            }

            auser.main_groupid = request.main_groupid;
            auser.isAdmin = request.isAdmin;
            auser.disable = request.disable;

            await MariaDbHelper.getConnection().manager.save(auser);

            return {
                statusCode: StatusCodes.OK
            };
        }

        return {
            statusCode: StatusCodes.UNAUTHORIZED
        };
    }

}