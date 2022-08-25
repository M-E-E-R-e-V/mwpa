import * as bcrypt from 'bcrypt';
import {Body, Get, JsonController, Post, Session} from 'routing-controllers';
import {Devices as DevicesDB} from '../../inc/Db/MariaDb/Entity/Devices';
import {User as UserDB} from '../../inc/Db/MariaDb/Entity/User';
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

        const user = await userRepository.findOne({
            where: {
                email: login.email,
                disable: false
            }
        });

        const userData: SessionUserData = {
            isLogin: false,
            isAdmin: false,
            isMobileLogin: true,
            userid: 0
        };

        session.user = userData;

        if (user) {
            const bresult = await bcrypt.compare(login.password, user.password);

            if (bresult) {
                session.user.userid = user.id;
                session.user.isLogin = true;
                session.user.isAdmin = user.isAdmin;
                session.user.deviceIdentity = login.deviceIdentity;

                Logger.log(`Login success by session: ${session.id}`);

                const devicesRepository = MariaDbHelper.getConnection().getRepository(DevicesDB);
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