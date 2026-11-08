import {Router} from 'express';
import {DefaultRoute} from '@stefanwerfling/figtree';
import {
    LoginResponse,
    MobileQuickConnectResponse,
    SchemaLoginResponse,
    SchemaMWPASessionData,
    SchemaMobileQuickConnectRequest,
    SchemaMobileQuickConnectResponse,
    SchemaMobileTokenLoginRequest,
    SchemaMobileTokenLogoutRequest
} from 'mwpa_schemas';
import {defaultMWPASessionInit} from '../SessionDefault.js';
import {MobileDeviceToken} from './QuickConnect/MobileDeviceToken.js';
import {MobileQuickConnect as MobileQuickConnectHandler} from './QuickConnect/MobileQuickConnect.js';

/**
 * Mobile/QuickConnect — POST /mobile/quickconnect: exchange an OTP for a
 * session and a device token; POST /mobile/login/token and
 * /mobile/logout/token: later logins / logout of that device with the token
 * (password replacement). /mobile/login (password, PIN) is unchanged.
 *
 * Responses reuse {success, error} so the Flutter app can share the same
 * post-login codepath as /mobile/login.
 */
export class QuickConnect extends DefaultRoute {

    public getExpressRouter(): Router {

        this._post(
            '/mobile/quickconnect',
            false,
            async(_req, _res, data): Promise<MobileQuickConnectResponse> => {
                if (!data.session) {
                    return {success: false, error: 'None session found!'};
                }
                return MobileQuickConnectHandler.exchange(data.body, data.session);
            },
            {
                description: 'Log a mobile client in by consuming a single-use Quick Connect OTP; returns a device token for later logins.',
                bodySchema: SchemaMobileQuickConnectRequest,
                responseBodySchema: SchemaMobileQuickConnectResponse,
                sessionSchema: SchemaMWPASessionData,
                sessionInit: defaultMWPASessionInit
            }
        );

        this._post(
            '/mobile/login/token',
            false,
            async(req, _res, data): Promise<LoginResponse> => {
                if (!data.session) {
                    return {success: false, error: 'None session found!'};
                }
                const userAgent = typeof req.headers['user-agent'] === 'string' ? req.headers['user-agent'] : '';
                return MobileDeviceToken.login(data.body, data.session, userAgent);
            },
            {
                description: 'Log a Quick Connect device in with its device token (password replacement).',
                bodySchema: SchemaMobileTokenLoginRequest,
                responseBodySchema: SchemaLoginResponse,
                sessionSchema: SchemaMWPASessionData,
                sessionInit: defaultMWPASessionInit
            }
        );

        this._post(
            '/mobile/logout/token',
            false,
            async(_req, _res, data): Promise<LoginResponse> => MobileDeviceToken.logout(data.body),
            {
                description: 'Revoke the device token of a Quick Connect device (app logout).',
                bodySchema: SchemaMobileTokenLogoutRequest,
                responseBodySchema: SchemaLoginResponse
            }
        );

        return super.getExpressRouter();
    }

}