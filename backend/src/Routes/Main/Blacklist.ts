import {Router} from 'express';
import {DefaultRoute} from '@stefanwerfling/figtree';
import {StatusCodes} from 'figtree-schemas';
import {
    BlacklistListResponse,
    BlacklistUnblockResponse,
    SchemaBlacklistListResponse,
    SchemaBlacklistUnblockRequest,
    SchemaBlacklistUnblockResponse,
    SchemaMWPASessionData
} from 'mwpa_schemas';
import {RateLimitRegistry} from '../../Application/RateLimitRegistry.js';
import {checkMWPAAdminIsLogin} from '../AuthCheck.js';
import {defaultMWPASessionInit} from '../SessionDefault.js';

/**
 * Blacklist route — admin-only view of the IPs the rate limiter is currently
 * blocking, with an unblock action. Backed by the in-memory
 * {@link RateLimitRegistry} fed by {@link MWPAHttpServer._limiterHandler}.
 */
export class Blacklist extends DefaultRoute {

    /**
     * Return the express router
     * @return {Router}
     */
    public getExpressRouter(): Router {
        this._post(
            '/json/blacklist/list',
            checkMWPAAdminIsLogin,
            // eslint-disable-next-line @typescript-eslint/require-await
            async(): Promise<BlacklistListResponse> => {
                return {
                    statusCode: StatusCodes.OK,
                    list: RateLimitRegistry.getInstance().list()
                };
            },
            {
                description: 'List IPs currently blocked by the rate limiter.',
                responseBodySchema: SchemaBlacklistListResponse,
                sessionSchema: SchemaMWPASessionData,
                sessionInit: defaultMWPASessionInit
            }
        );

        this._post(
            '/json/blacklist/unblock',
            checkMWPAAdminIsLogin,
            // eslint-disable-next-line @typescript-eslint/require-await
            async(_req, _res, data): Promise<BlacklistUnblockResponse> => {
                const ip = data.body?.ip ?? '';

                return {
                    statusCode: StatusCodes.OK,
                    success: ip === '' ? false : RateLimitRegistry.getInstance().unblock(ip)
                };
            },
            {
                description: 'Unblock (reset the rate limiter for) an IP.',
                bodySchema: SchemaBlacklistUnblockRequest,
                responseBodySchema: SchemaBlacklistUnblockResponse,
                sessionSchema: SchemaMWPASessionData,
                sessionInit: defaultMWPASessionInit
            }
        );

        return super.getExpressRouter();
    }

}
