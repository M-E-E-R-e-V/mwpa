import * as bcrypt from 'bcrypt';
import {Body, Get, JsonController, Post, Session} from 'routing-controllers';
import {Group as GroupDB} from '../../inc/Db/MariaDb/Entity/Group';
import {Organization as OrganizationDB} from '../../inc/Db/MariaDb/Entity/Organization';
import {User as UserDB} from '../../inc/Db/MariaDb/Entity/User';
import {MariaDbHelper} from '../../inc/Db/MariaDb/MariaDbHelper';
import {DefaultReturn} from '../../inc/Routes/DefaultReturn';
import {StatusCodes} from '../../inc/Routes/StatusCodes';

/**
 * SightingsFilter
 */
export type UserListFilter = {
    filter?: {
        show_disabled?: boolean;
    };
    limit?: number;
    offset?: number;
};

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
    lat: string;
    lon: string;
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
    password_repeat?: string;
    pin?: string;
    pin_repeat?: string;
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
                const data: UserInfo = {
                    islogin: true,
                    user: {
                        id: user.id,
                        username: user.username,
                        fullname: user.full_name,
                        email: user.email,
                        isAdmin: user.isAdmin
                    }
                };

                const mainGroup = await groupRepository.findOne({
                    where: {
                        id: user.main_groupid
                    }
                });

                if (mainGroup) {
                    data.group = {
                        id: mainGroup.id,
                        name: mainGroup.description
                    };

                    const org = await orgRepository.findOne({
                        where: {
                            id: mainGroup.organization_id
                        }
                    });

                    if (org) {
                        data.organization = {
                            id: org.id,
                            name: org.description,
                            lat: org.lat,
                            lon: org.lon
                        };
                    }
                }

                return {
                    statusCode: StatusCodes.OK,
                    data
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
     * @param {UserListFilter} filter
     * @param {any} session
     */
    @Post('/json/user/list')
    public async getList(@Body() filter: UserListFilter, @Session() session: any): Promise<UserListResponse> {
        if ((session.user !== undefined) && session.user.isLogin) {
            if (!session.user.isAdmin) {
                return {
                    statusCode: StatusCodes.FORBIDDEN
                };
            }

            const where: any = {};

            if (filter.filter) {
                if (filter.filter.show_disabled !== undefined) {
                    if (!filter.filter.show_disabled) {
                        where.disable = false;
                    }
                }
            }

            const userRepository = MariaDbHelper.getConnection().getRepository(UserDB);
            const users = await userRepository.find({
                where
            });

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

            if (request.password && request.password_repeat) {
                if (request.password === '') {
                    return {
                        statusCode: StatusCodes.INTERNAL_ERROR,
                        msg: 'Password is empty!'
                    };
                }

                if (request.password !== request.password_repeat) {
                    return {
                        statusCode: StatusCodes.INTERNAL_ERROR,
                        msg: 'Password repeat is different!'
                    };
                }

                auser.password = await bcrypt.hash(request.password!, 10);
            }

            if (request.pin && request.pin_repeat) {
                if (request.pin === '') {
                    return {
                        statusCode: StatusCodes.INTERNAL_ERROR,
                        msg: 'Pin is empty!'
                    };
                }

                if (request.pin !== request.pin_repeat) {
                    return {
                        statusCode: StatusCodes.INTERNAL_ERROR,
                        msg: 'Pin repeat is different!'
                    };
                }

                auser.pin = await bcrypt.hash(request.pin!, 10);
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
                    id: session.user.userid
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

    /**
     * savePin
     * @param session
     * @param request
     */
    @Post('/json/user/savepin')
    public async savePin(@Session() session: any, @Body() request: UserSavePin): Promise<DefaultReturn> {
        if ((session.user !== undefined) && session.user.isLogin) {
            const userRepository = MariaDbHelper.getConnection().getRepository(UserDB);
            const user = await userRepository.findOne({
                where: {
                    id: session.user.userid
                }
            });

            if (user) {
                if (request.pin === request.repeatpin) {
                    user.pin = await bcrypt.hash(request.pin!, 10);

                    await MariaDbHelper.getConnection().manager.save(user);

                    return {
                        statusCode: StatusCodes.OK
                    };
                }

                return {
                    statusCode: StatusCodes.INTERNAL_ERROR,
                    msg: 'The repeat pin is differend!'
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

}