import {Router} from 'express';
import {DefaultRoute} from 'figtree';
import {
    LoginResponse,
    SchemaLoginResponse,
    SchemaMWPASessionData,
    SchemaMobileQuickConnectRequest
} from 'mwpa_schemas';
import {defaultMWPASessionInit} from '../SessionDefault.js';
import {MobileQuickConnect as MobileQuickConnectHandler} from './QuickConnect/MobileQuickConnect.js';

/**
 * Mobile/QuickConnect — POST /mobile/quickconnect: exchange an OTP for a session.
 *
 * Response reuses {success, error} so the Flutter app can share the same
 * post-login codepath as /mobile/login.
 */
export class QuickConnect extends DefaultRoute {

    public getExpressRouter(): Router {

        this._post(
            '/mobile/quickconnect',
            false,
            async(_req, _res, data): Promise<LoginResponse> => {
                if (!data.session) {
                    return {success: false, error: 'None session found!'};
                }
                return MobileQuickConnectHandler.exchange(data.body, data.session);
            },
            {
                description: 'Log a mobile client in by consuming a single-use Quick Connect OTP.',
                bodySchema: SchemaMobileQuickConnectRequest,
                responseBodySchema: SchemaLoginResponse,
                sessionSchema: SchemaMWPASessionData,
                sessionInit: defaultMWPASessionInit
            }
        );

        return super.getExpressRouter();
    }

}