import {Router} from 'express';
import {DefaultRoute} from '@stefanwerfling/figtree';
import {DefaultReturn, SchemaDefaultReturn, StatusCodes} from 'figtree-schemas';
import {
    SchemaMWPASessionData,
    SchemaUserData,
    SchemaUserInfoResponse,
    SchemaUserListFilter,
    SchemaUserListResponse,
    SchemaUserSavePasswordRequest,
    SchemaUserSavePinRequest,
    UserInfoResponse,
    UserListResponse,
    RightUser,
    RightUsers,
} from 'mwpa_schemas';
import {checkMWPAUserIsLoginACL} from '../AuthCheck.js';
import {defaultMWPASessionInit} from '../SessionDefault.js';
import {Info} from './User/Info.js';
import {List} from './User/List.js';
import {Save} from './User/Save.js';
import {SavePassword} from './User/SavePassword.js';
import {SavePin} from './User/SavePin.js';

/**
 * User
 */
export class User extends DefaultRoute {

    /**
     * Return the express router
     * @returns {Router}
     */
    public getExpressRouter(): Router {

        // info — note: original is not gated by auth, returns islogin:false for anonymous.
        this._get(
            '/json/user/info',
            false,
            async(_req, _res, data): Promise<UserInfoResponse> => {
                const userId = data.session?.user?.userid ?? 0;
                return Info.getInfo(userId, data.session?.user?.rights ?? []);
            },
            {
                description: 'Return profile data for the current session user (or islogin:false).'
                    + ' Public (returns islogin:false for anonymous) — not gated; attaches the'
                    + ' effective right set to user.rights so the web UI can gate its menu.',
                responseBodySchema: SchemaUserInfoResponse,
                sessionSchema: SchemaMWPASessionData,
                sessionInit: defaultMWPASessionInit,
            }
        );

        this._post(
            '/json/user/list',
            checkMWPAUserIsLoginACL,
            async(_req, _res, data): Promise<UserListResponse> => {
                if (!data.session?.user?.isAdmin) {
                    return {
                        statusCode: StatusCodes.FORBIDDEN
                    };
                }
                return List.getList(data.body);
            },
            {
                description: 'Return all users (admin only).',
                aclRight: RightUsers.users_read,
                bodySchema: SchemaUserListFilter,
                responseBodySchema: SchemaUserListResponse,
                sessionSchema: SchemaMWPASessionData,
                sessionInit: defaultMWPASessionInit,
            }
        );

        this._post(
            '/json/user/save',
            checkMWPAUserIsLoginACL,
            async(_req, _res, data): Promise<DefaultReturn> => {
                if (!data.session?.user?.isAdmin) {
                    return {
                        statusCode: StatusCodes.FORBIDDEN
                    };
                }
                return Save.saveUser(data.body);
            },
            {
                description: 'Insert or update a user (admin only).',
                aclRight: RightUsers.users_write,
                bodySchema: SchemaUserData,
                responseBodySchema: SchemaDefaultReturn,
                sessionSchema: SchemaMWPASessionData,
                sessionInit: defaultMWPASessionInit,
            }
        );

        this._post(
            '/json/user/savepassword',
            checkMWPAUserIsLoginACL,
            async(_req, _res, data): Promise<DefaultReturn> => {
                const userId = data.session?.user?.userid ?? 0;
                return SavePassword.savePassword(userId, data.body);
            },
            {
                description: 'Update the password of the current session user.',
                aclRight: RightUser.user_write,
                bodySchema: SchemaUserSavePasswordRequest,
                responseBodySchema: SchemaDefaultReturn,
                sessionSchema: SchemaMWPASessionData,
                sessionInit: defaultMWPASessionInit,
            }
        );

        this._post(
            '/json/user/savepin',
            checkMWPAUserIsLoginACL,
            async(_req, _res, data): Promise<DefaultReturn> => {
                const userId = data.session?.user?.userid ?? 0;
                return SavePin.savePin(userId, data.body);
            },
            {
                description: 'Update the mobile pin of the current session user.',
                aclRight: RightUser.user_write,
                bodySchema: SchemaUserSavePinRequest,
                responseBodySchema: SchemaDefaultReturn,
                sessionSchema: SchemaMWPASessionData,
                sessionInit: defaultMWPASessionInit,
            }
        );

        return super.getExpressRouter();
    }

}
