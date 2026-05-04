import {Router} from 'express';
import {DefaultRoute} from 'figtree';
import {
    LoginIsLoginResponse,
    LoginResponse,
    SchemaLoginIsLoginResponse,
    SchemaLoginResponse,
    SchemaMWPASessionData,
    SchemaMobileLoginRequest
} from 'mwpa_schemas';
import {isMWPAUserLogin} from '../AuthCheck.js';
import {defaultMWPASessionInit} from '../SessionDefault.js';
import {MobileLogin} from './Login/MobileLogin.js';

/**
 * Mobile/Login
 */
export class Login extends DefaultRoute {

    /**
     * Return the express router
     * @returns {Router}
     */
    public getExpressRouter(): Router {

        this._get(
            '/mobile/islogin',
            false,
            async(req): Promise<LoginIsLoginResponse> => ({
                status: isMWPAUserLogin(req)
            }),
            {
                description: 'Is the mobile session logged in.',
                responseBodySchema: SchemaLoginIsLoginResponse
            }
        );

        this._post(
            '/mobile/login',
            false,
            async(_req, _res, data): Promise<LoginResponse> => {
                if (!data.session) {
                    return {success: false, error: 'None session found!'};
                }
                return MobileLogin.login(data.body, data.session);
            },
            {
                description: 'Login a mobile client (password or PIN on a known device).',
                bodySchema: SchemaMobileLoginRequest,
                responseBodySchema: SchemaLoginResponse,
                sessionSchema: SchemaMWPASessionData,
                sessionInit: defaultMWPASessionInit,
            }
        );

        return super.getExpressRouter();
    }

}
