import * as bcrypt from 'bcrypt';
import {Body, Get, JsonController, Post, Session} from 'routing-controllers';
import {Group as GroupDB} from '../../inc/Db/MariaDb/Entity/Group';
import {Organization as OrganizationDB} from '../../inc/Db/MariaDb/Entity/Organization';
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
 * UserInfoGroup
 */
export type UserInfoGroup = {
    name: string;
    id: number;
};

/**
 * UserInfoOrg
 */
export type UserInfoOrg = {
    name: string;
    id: number;
};

/**
 * UserInfo
 */
export type UserInfo = {
    islogin: boolean;
    user?: UserInfoData;
    group?: UserInfoGroup;
    organization?: UserInfoOrg;
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
 * UserSavePassword
 */
export type UserSavePassword = {
    password: string;
    repeatpassword: string;
};

/**
 * UserSavePin
 */
export type UserSavePin = {
  pin: string;
  repeatpin: string;
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
            const groupRepository = MariaDbHelper.getConnection().getRepository(GroupDB);
            const orgRepository = MariaDbHelper.getConnection().getRepository(OrganizationDB);

            const user = await userRepository.findOne({
                where: {
                    id: session.user.userid
                }
            });

            if (user) {
                const mainGroup = await groupRepository.findOne({
                    where: {
                        id: user.main_groupid
                    }
                });

                const org = await orgRepository.findOne({
                    where: {
                        id: mainGroup?.organization_id!
                    }
                });

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
                        },
                        group: {
                            id: mainGroup?.id!,
                            name: mainGroup?.description!
                        },
                        organization: {
                            id: org?.id!,
                            name: org?.description!
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

    /**
     * savePassword
     * @param session
     * @param request
     */
    @Post('/json/user/savepassword')
    public async savePassword(@Session() session: any, @Body() request: UserSavePassword): Promise<DefaultReturn> {
        if ((session.user !== undefined) && session.user.isLogin) {
            const userRepository = MariaDbHelper.getConnection().getRepository(UserDB);
            const user = await userRepository.findOne({
                where: {
                    id: session.user.id
                }
            });

            if (user) {
                if (request.password === request.repeatpassword) {
                    user.password = await bcrypt.hash(request.password!, 10);

                    await MariaDbHelper.getConnection().manager.save(user);

                    return {
                        statusCode: StatusCodes.OK
                    };
                }

                return {
                    statusCode: StatusCodes.INTERNAL_ERROR,
                    msg: 'The repeat password is differend!'
                };
            }

            return {
                statusCode: StatusCodes.INTERNAL_ERROR,
                msg: 'User not found by session-user-id!'
            };
        }

        return {
            statusCode: StatusCodes.UNAUTHORIZED
        };
    }

    public async savePin(@Session() session: any, @Body() request: UserSavePin): Promise<DefaultReturn> {
        if ((session.user !== undefined) && session.user.isLogin) {

        }

        return {
            statusCode: StatusCodes.UNAUTHORIZED
        };
    }

}