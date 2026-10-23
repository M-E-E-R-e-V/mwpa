import {Router} from 'express';
import {DefaultRoute} from '@stefanwerfling/figtree';
import {StatusCodes} from 'figtree-schemas';
import {
    BlacklistListResponse,
    BlacklistUnblockResponse,
    LoginLockoutListResponse,
    LoginLockoutUnblockResponse,
    SchemaBlacklistListResponse,
    SchemaBlacklistUnblockRequest,
    SchemaBlacklistUnblockResponse,
    SchemaLoginLockoutListResponse,
    SchemaLoginLockoutUnblockRequest,
    SchemaLoginLockoutUnblockResponse,
    SchemaMWPASessionData,
    RightBlacklist,
} from 'mwpa_schemas';
import {LoginLockoutRegistry} from '../../Application/LoginLockoutRegistry.js';
import {RateLimitRegistry} from '../../Application/RateLimitRegistry.js';
import {checkMWPAUserIsLoginACL} from '../AuthCheck.js';
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
            checkMWPAUserIsLoginACL,
            // eslint-disable-next-line @typescript-eslint/require-await
            async(): Promise<BlacklistListResponse> => {
                return {
                    statusCode: StatusCodes.OK,
                    list: RateLimitRegistry.getInstance().list()
                };
            },
            {
                description: 'List IPs currently blocked by the rate limiter.',
                aclRight: RightBlacklist.blacklist_read,
                responseBodySchema: SchemaBlacklistListResponse,
                sessionSchema: SchemaMWPASessionData,
                sessionInit: defaultMWPASessionInit
            }
        );

        this._post(
            '/json/blacklist/unblock',
            checkMWPAUserIsLoginACL,
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
                aclRight: RightBlacklist.blacklist_write,
                bodySchema: SchemaBlacklistUnblockRequest,
                responseBodySchema: SchemaBlacklistUnblockResponse,
                sessionSchema: SchemaMWPASessionData,
                sessionInit: defaultMWPASessionInit
            }
        );

        this._post(
            '/json/login_lockout/list',
            checkMWPAUserIsLoginACL,
            // eslint-disable-next-line @typescript-eslint/require-await
            async(): Promise<LoginLockoutListResponse> => {
                return {
                    statusCode: StatusCodes.OK,
                    list: LoginLockoutRegistry.getInstance().list()
                };
            },
            {
                description: 'List accounts/devices currently locked out after failed mobile logins.',
                aclRight: RightBlacklist.blacklist_read,
                responseBodySchema: SchemaLoginLockoutListResponse,
                sessionSchema: SchemaMWPASessionData,
                sessionInit: defaultMWPASessionInit
            }
        );

        this._post(
            '/json/login_lockout/unblock',
            checkMWPAUserIsLoginACL,
            // eslint-disable-next-line @typescript-eslint/require-await
            async(_req, _res, data): Promise<LoginLockoutUnblockResponse> => {
                const key = data.body?.key ?? '';

                return {
                    statusCode: StatusCodes.OK,
                    success: key === '' ? false : LoginLockoutRegistry.getInstance().unlock(key)
                };
            },
            {
                description: 'Lift a login lockout by its key.',
                aclRight: RightBlacklist.blacklist_write,
                bodySchema: SchemaLoginLockoutUnblockRequest,
                responseBodySchema: SchemaLoginLockoutUnblockResponse,
                sessionSchema: SchemaMWPASessionData,
                sessionInit: defaultMWPASessionInit
            }
        );

        return super.getExpressRouter();
    }

}