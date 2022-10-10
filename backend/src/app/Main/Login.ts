import {Body, Get, JsonController, Post, Session} from 'routing-controllers';
import {Group as GroupDB} from '../../inc/Db/MariaDb/Entity/Group';
import {User as UserDB} from '../../inc/Db/MariaDb/Entity/User';
import {UserGroups as UserGroupsDB} from '../../inc/Db/MariaDb/Entity/UserGroups';
import {MariaDbHelper} from '../../inc/Db/MariaDb/MariaDbHelper';
import {Logger} from '../../inc/Logger/Logger';
import {SessionUserData} from '../../inc/Server/Session';
import * as bcrypt from 'bcrypt';

/**
 * LoginRequest
 */
export type LoginRequest = {
    email: string;
    password: string;
};

/**
 * LoginResponse
 */
export type LoginResponse = {
    success: boolean;
    error: string | null;
};

/**
 * LoginIsLoginResponse
 */
export type LoginIsLoginResponse = {
    status: boolean;
};

/**
 * Login
 */
@JsonController()
export class Login {

    /**
     * islogin
     * @param session
     */
    @Get('/json/islogin')
    public islogin(@Session() session: any): LoginIsLoginResponse {
        if ((session.user !== undefined) && session.user.isLogin) {
            return {status: true};
        }

        return {status: false};
    }

    /**
     * login
     * @param login
     * @param session
     */
    @Post('/json/login')
    public async login(
        @Body() login: LoginRequest,
        @Session() session: any
    ): Promise<LoginResponse> {
        if (login.email === '') {
            return {
                success: false,
                error: 'Email is empty!'
            };
        }

        if (login.password === '') {
            return {
                success: false,
                error: 'Password is empty!'
            };
        }

        const userRepository = MariaDbHelper.getConnection().getRepository(UserDB);

        const user = await userRepository.findOne({
            where: {
                email: login.email,
                disable: false
            }
        });

        const userData: SessionUserData = {
            isLogin: false,
            isAdmin: false,
            isMobileLogin: false,
            userid: 0,
            main_group_id: 0,
            main_organization_id: 0,
            groups: [],
            organizations: []
        };

        session.user = userData;

        if (user) {
            const bresult = await bcrypt.compare(login.password, user.password);

            if (bresult) {
                session.user.userid = user.id;
                session.user.isLogin = true;
                session.user.isAdmin = user.isAdmin;
                session.user.main_group_id = user.main_groupid;

                const groupRepository = MariaDbHelper.getConnection().getRepository(GroupDB);

                const groups: number[] = [];
                const organisations: number[] = [];

                const mainGroup = await groupRepository.findOne({
                    where: {
                        id: user.main_groupid
                    }
                });

                if (mainGroup) {
                    groups.push(mainGroup.id);
                    organisations.push(mainGroup.organization_id);
                }

                const userGroups = MariaDbHelper.getConnection().getRepository(UserGroupsDB);
                const dbgroups = await userGroups.find({
                    where: {
                        user_id: user.id
                    }
                });

                if (dbgroups) {
                    for (const dbgroup of dbgroups) {
                        if (groups.indexOf(dbgroup.group_id) === -1) {
                            const subGroup = await groupRepository.findOne({
                                where: {
                                    id: dbgroup.group_id
                                }
                            });

                            if (subGroup) {
                                groups.push(subGroup.id);
                                organisations.push(subGroup.organization_id);
                            }
                        }
                    }
                }

                session.user.groups = groups;
                session.user.organizations = organisations;

                Logger.log(`Login success by session: ${session.id}`);

                return {
                    success: true,
                    error: ''
                };
            }

            Logger.log(`Login faild: wrong password by email: ${login.email}`);

            return {
                success: false,
                error: 'Wrong password!'
            };
        }

        return {
            success: false,
            error: 'User not found.'
        };
    }

}