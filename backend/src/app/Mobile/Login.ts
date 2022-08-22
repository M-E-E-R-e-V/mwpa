import {Body, Get, JsonController, Post, Session} from 'routing-controllers';
import {LoginIsLoginResponse, LoginRequest, LoginResponse, Login as MainLogin} from '../Main/Login';

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
        @Body() login: LoginRequest,
        @Session() session: any
    ): Promise<LoginResponse> {
        return super.login(login, session);
    }

}