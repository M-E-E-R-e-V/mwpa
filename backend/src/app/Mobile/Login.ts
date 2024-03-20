import * as bcrypt from 'bcrypt';
import {Body, Get, JsonController, Post, Session} from 'routing-controllers';
import {Devices as DevicesDB} from '../../inc/Db/MariaDb/Entity/Devices';
import {Group as GroupDB} from '../../inc/Db/MariaDb/Entity/Group';
import {User as UserDB} from '../../inc/Db/MariaDb/Entity/User';
import {UserGroups as UserGroupsDB} from '../../inc/Db/MariaDb/Entity/UserGroups';
import {MariaDbHelper} from '../../inc/Db/MariaDb/MariaDbHelper';
import {Logger} from '../../inc/Logger/Logger';
import {SessionUserData} from '../../inc/Server/Session';
import {DateHelper} from '../../inc/Utils/DateHelper';
import {LoginIsLoginResponse, LoginRequest, LoginResponse, Login as MainLogin} from '../Main/Login';

/**
 * MobileLoginRequest
 */
export type MobileLoginRequest = LoginRequest & {
    deviceIdentity: string;
    deviceDescription: string;
};

/**
 * Login
 */
@JsonController()
export class Login extends MainLogin {

    /**
     * islogin
     * @param session
     */
    @Get('/mobile/islogin')
    public islogin(@Session() session: any): LoginIsLoginResponse {
        return super.islogin(session);
    }

    /**
     * login
     * @param login
     * @param session
     */
    @Post('/mobile/login')
    public async login(
        @Body() login: MobileLoginRequest,
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
        const groupRepository = MariaDbHelper.getConnection().getRepository(GroupDB);
        const devicesRepository = MariaDbHelper.getConnection().getRepository(DevicesDB);

        const user = await userRepository.findOne({
            where: {
                email: login.email,
                disable: false
            }
        });

        session.user = {
            isLogin: false,
            isAdmin: false,
            isMobileLogin: true,
            userid: 0,
            main_group_id: 0,
            main_organization_id: 0,
            groups: [],
            organizations: []
        } as SessionUserData;

        if (user) {
            const bresult = await bcrypt.compare(login.password, user.password);
            let pinresult = false;

            if (!bresult) {
                Logger.log(`Password is differend, check is pin by session: ${session.id}`);

                const knownDevice = await devicesRepository.findOne({
                    where: {
                        identity: login.deviceIdentity,
                        user_id: user.id
                    }
                });

                if (knownDevice) {
                    Logger.log(`Device is found, start pin check by session: ${session.id}`);

                    pinresult = await bcrypt.compare(login.password, user.pin);

                    if (pinresult) {
                        Logger.log(`Is pin login by session: ${session.id}`);
                    } else {
                        Logger.log(`Wrong pin login by session: ${session.id}`);
                    }
                }
            }

            if (bresult || pinresult) {
                // eslint-disable-next-line require-atomic-updates
                session.user.userid = user.id;
                // eslint-disable-next-line require-atomic-updates
                session.user.isLogin = true;
                // eslint-disable-next-line require-atomic-updates
                session.user.isAdmin = user.isAdmin;
                // eslint-disable-next-line require-atomic-updates
                session.user.deviceIdentity = login.deviceIdentity;
                // eslint-disable-next-line require-atomic-updates
                session.user.main_group_id = user.main_groupid;

                const groups: number[] = [];
                const organizations: number[] = [];

                const mainGroup = await groupRepository.findOne({
                    where: {
                        id: user.main_groupid
                    }
                });

                if (mainGroup) {
                    groups.push(mainGroup.id);
                    organizations.push(mainGroup.organization_id);

                    // eslint-disable-next-line require-atomic-updates
                    session.user.main_organization_id = mainGroup.organization_id;
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
                                organizations.push(subGroup.organization_id);
                            }
                        }
                    }
                }

                // eslint-disable-next-line require-atomic-updates
                session.user.groups = groups;
                // eslint-disable-next-line require-atomic-updates
                session.user.organizations = organizations;

                Logger.log(`Login success by session: ${session.id}`);

                const tdevice = await devicesRepository.findOne({
                    where: {
                        identity: login.deviceIdentity,
                        user_id: user.id
                    }
                });

                let myDevice: DevicesDB|null = null;

                if (tdevice) {
                    myDevice = tdevice;
                }

                if (myDevice === null) {
                    myDevice = new DevicesDB();
                    myDevice.identity = login.deviceIdentity;
                    myDevice.create_datetime = DateHelper.getCurrentDbTime();
                    myDevice.user_id = user.id;
                }

                myDevice.update_datetime = DateHelper.getCurrentDbTime();

                if (myDevice.description === '') {
                    myDevice.description = login.deviceDescription;
                }

                await MariaDbHelper.getConnection().manager.save(myDevice);

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