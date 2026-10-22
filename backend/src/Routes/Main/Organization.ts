import {Router} from 'express';
import {DefaultRoute} from '@stefanwerfling/figtree';
import {DefaultReturn, SchemaDefaultReturn, StatusCodes} from 'figtree-schemas';
import {
    OrganizationListResponse,
    OrganizationResponse,
    OrganizationTrackingAreaResponse,
    OrganizationUserListResponse,
    SchemaMWPASessionData,
    SchemaOrganizationFullEntry,
    SchemaOrganizationGetRequest,
    SchemaOrganizationListResponse,
    SchemaOrganizationResponse,
    SchemaOrganizationTrackingAreaEntry,
    SchemaOrganizationTrackingAreaRequest,
    SchemaOrganizationTrackingAreaResponse,
    SchemaOrganizationUserListResponse,
    RightOrganizations,
} from 'mwpa_schemas';
import {checkMWPAUserIsLoginACL} from '../AuthCheck.js';
import {defaultMWPASessionInit} from '../SessionDefault.js';
import {Get} from './Organization/Get.js';
import {List} from './Organization/List.js';
import {Save} from './Organization/Save.js';
import {TrackingArea} from './Organization/TrackingArea.js';
import {UserList} from './Organization/UserList.js';

/**
 * Organization
 */
export class Organization extends DefaultRoute {

    /**
     * Return the express router
     * @returns {Router}
     */
    public getExpressRouter(): Router {

        // userlist ----------------------------------------------------------------------------------------------------

        this._get(
            '/json/organization/userlist',
            checkMWPAUserIsLoginACL,
            async(_req, _res, data): Promise<OrganizationUserListResponse> => {
                const sessionUser = data.session?.user;
                const userId = sessionUser?.userid ?? 0;
                const isAdmin = sessionUser?.isAdmin ?? false;
                return UserList.getList(userId, isAdmin);
            },
            {
                description: 'Return organizations available to the session user.',
                aclRight: RightOrganizations.organizations_read,
                responseBodySchema: SchemaOrganizationUserListResponse,
                sessionSchema: SchemaMWPASessionData,
                sessionInit: defaultMWPASessionInit,
            }
        );

        // list --------------------------------------------------------------------------------------------------------

        this._get(
            '/json/organization/list',
            checkMWPAUserIsLoginACL,
            async(): Promise<OrganizationListResponse> => {
                return List.getList();
            },
            {
                description: 'Return all organizations.',
                aclRight: RightOrganizations.organizations_read,
                responseBodySchema: SchemaOrganizationListResponse
            }
        );

        // get ---------------------------------------------------------------------------------------------------------

        this._post(
            '/json/organization/get',
            checkMWPAUserIsLoginACL,
            async(_req, _res, data): Promise<OrganizationResponse> => {
                return Get.getOrganization(data.body);
            },
            {
                description: 'Return one organization by id.',
                aclRight: RightOrganizations.organizations_read,
                bodySchema: SchemaOrganizationGetRequest,
                responseBodySchema: SchemaOrganizationResponse
            }
        );

        // save --------------------------------------------------------------------------------------------------------

        this._post(
            '/json/organization/save',
            checkMWPAUserIsLoginACL,
            async(_req, _res, data): Promise<DefaultReturn> => {
                if (!data.session?.user?.isAdmin) {
                    return {
                        statusCode: StatusCodes.FORBIDDEN
                    };
                }
                return Save.saveOrganization(data.body);
            },
            {
                description: 'Insert or update an organization (admin only).',
                aclRight: RightOrganizations.organizations_write,
                bodySchema: SchemaOrganizationFullEntry,
                responseBodySchema: SchemaDefaultReturn,
                sessionSchema: SchemaMWPASessionData,
                sessionInit: defaultMWPASessionInit,
            }
        );

        // trackingarea/list (get one) ---------------------------------------------------------------------------------

        this._post(
            '/json/organization/trackingarea/list',
            checkMWPAUserIsLoginACL,
            async(_req, _res, data): Promise<OrganizationTrackingAreaResponse> => {
                if (!data.session?.user?.isAdmin) {
                    return {
                        statusCode: StatusCodes.FORBIDDEN
                    };
                }
                return TrackingArea.getTrackingArea(data.body);
            },
            {
                description: 'Look up a tracking area by id or by organization id + area type (admin only).',
                aclRight: RightOrganizations.organizations_read,
                bodySchema: SchemaOrganizationTrackingAreaRequest,
                responseBodySchema: SchemaOrganizationTrackingAreaResponse,
                sessionSchema: SchemaMWPASessionData,
                sessionInit: defaultMWPASessionInit,
            }
        );

        // trackingarea/save -------------------------------------------------------------------------------------------

        this._post(
            '/json/organization/trackingarea/save',
            checkMWPAUserIsLoginACL,
            async(_req, _res, data): Promise<DefaultReturn> => {
                if (!data.session?.user?.isAdmin) {
                    return {
                        statusCode: StatusCodes.FORBIDDEN
                    };
                }
                return TrackingArea.saveTrackingArea(data.body);
            },
            {
                description: 'Insert or update a tracking area (admin only).',
                aclRight: RightOrganizations.organizations_write,
                bodySchema: SchemaOrganizationTrackingAreaEntry,
                responseBodySchema: SchemaDefaultReturn,
                sessionSchema: SchemaMWPASessionData,
                sessionInit: defaultMWPASessionInit,
            }
        );

        return super.getExpressRouter();
    }

}
