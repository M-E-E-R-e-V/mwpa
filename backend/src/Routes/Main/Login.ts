import * as bcrypt from 'bcrypt';
import {Router} from 'express';
import {DefaultRoute, Logger} from 'figtree';
import {
    LoginIsLoginResponse,
    LoginRequest, LoginResponse, LogoutResponse,
    SchemaLoginIsLoginResponse,
    SchemaLoginRequest,
    SchemaLoginResponse, SchemaLogoutResponse,
    SchemaMWPASessionData
} from 'mwpa_schemas';
import {checkMWPAUserIsLogin, isMWPAUserLogin} from '../AuthCheck.js';
import {defaultMWPASessionInit} from '../SessionDefault.js';
import {GroupRepository} from '../../Db/MariaDb/Repositories/GroupRepository.js';
import {UserGroupsRepository} from '../../Db/MariaDb/Repositories/UserGroupsRepository.js';
import {UserRepository} from '../../Db/MariaDb/Repositories/UserRepository.js';

/**
 * Login
 */
export class Login extends DefaultRoute {

    /**
     * Return the express router
     * @returns {Router}
     */
    public getExpressRouter(): Router {

        // is login ----------------------------------------------------------------------------------------------------

        this._get(
            '/json/islogin',
            false,
            async(
                req
            ): Promise<LoginIsLoginResponse> => {
                return {
                    status: isMWPAUserLogin(req)
                };
            },
            {
                description: 'Is a user login on session',
                responseBodySchema: SchemaLoginIsLoginResponse
            }
        );

        // login -------------------------------------------------------------------------------------------------------

        this._post(
            '/json/login',
            false,
            async(_request,
                _response, data): Promise<LoginResponse> => {
                if (!data.session) {
                    return {
                        success: false,
                        error: 'None session found!'
                    };
                }

                data.session.user = {
                    isLogin: false,
                    isAdmin: false,
                    isMobileLogin: false,
                    userid: 0,
                    main_group_id: 0,
                    main_organization_id: 0,
                    groups: [],
                    organizations: [],
                    role: ''
                };

                // -----------------------------------------------------------------------------------------------------

                const body = data.body as LoginRequest;

                if (body.email === '') {
                    return {
                        success: false,
                        error: 'Email is empty!'
                    };
                }

                if (body.password === '') {
                    return {
                        success: false,
                        error: 'Password is empty!'
                    };
                }

                const user = await UserRepository.getInstance().getUserByEMail(
                    body.email,
                    false
                );

                if (user === null) {
                    Logger.getLogger().info(`Login faild: user not found: ${body.email}`);

                    return {
                        success: false,
                        error: 'User not found!'
                    };
                }

                // password check --------------------------------------------------------------------------------------

                const bresult = await bcrypt.compare(body.password, user.password);

                if (!bresult) {
                    Logger.getLogger().info(`Login faild: wrong password by email: ${body.email}`);

                    return {
                        success: false,
                        error: 'Wrong password!'
                    };
                }

                // init user -------------------------------------------------------------------------------------------

                const groups: number[] = [];
                const organizations: number[] = [];
                const mainGroupOrganizationId = 0;

                const mainGroup = await GroupRepository.getInstance().findOne(user.main_groupid);

                if (mainGroup) {
                    groups.push(mainGroup.id);
                    organizations.push(mainGroup.organization_id);
                }

                const userGroups = await UserGroupsRepository.getInstance().findAllBy(user.id);

                for await (const userGroup of userGroups) {
                    if (groups.indexOf(userGroup.group_id) === -1) {
                        const subGroup = await GroupRepository.getInstance().findOne(userGroup.group_id);

                        if (subGroup) {
                            groups.push(subGroup.id);
                            organizations.push(subGroup.organization_id);
                        }
                    }
                }

                // update session --------------------------------------------------------------------------------------

                // eslint-disable-next-line require-atomic-updates
                data.session.user = {
                    userid: user.id,
                    isLogin: true,
                    isAdmin: user.isAdmin,
                    isMobileLogin: false,
                    main_group_id: user.main_groupid,
                    deviceIdentity: '',
                    role: '',
                    organizations: organizations,
                    main_organization_id: mainGroupOrganizationId,
                    groups: groups
                };

                Logger.getLogger().info(`Login success by session: ${data.session.id}`);

                return {
                    success: true,
                    error: ''
                };
            },
            {
                description: 'Login a user and update the session',
                bodySchema: SchemaLoginRequest,
                responseBodySchema: SchemaLoginResponse,
                sessionSchema: SchemaMWPASessionData,
                sessionInit: defaultMWPASessionInit
            }
        );

        // logout ------------------------------------------------------------------------------------------------------

        this._get(
            '/json/logout',
            checkMWPAUserIsLogin,
            async(
                _request,
                _response,
                data
            ): Promise<LogoutResponse> => {
                if (!data.session) {
                    return {
                        success: false
                    };
                }

                // eslint-disable-next-line require-atomic-updates
                data.session.user = {
                    userid: 0,
                    isLogin: false,
                    isAdmin: false,
                    isMobileLogin: false,
                    main_group_id: 0,
                    deviceIdentity: '',
                    role: '',
                    organizations: [],
                    main_organization_id: 0,
                    groups: []
                };

                return {
                    success: true
                };
            },
            {
                description: 'Logout and rest the session to empty',
                bodySchema: SchemaLogoutResponse,
                sessionSchema: SchemaMWPASessionData,
                sessionInit: defaultMWPASessionInit
            }
        );

        // -------------------------------------------------------------------------------------------------------------

        return super.getExpressRouter();
    }

}
