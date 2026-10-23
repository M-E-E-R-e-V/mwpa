import {Router} from 'express';
import {DefaultRoute} from '@stefanwerfling/figtree';
import {checkMWPAUserIsLoginACL} from '../AuthCheck.js';
import {DefaultReturn, SchemaDefaultReturn, StatusCodes} from 'figtree-schemas';
import {
    GroupListResponse,
    SchemaGroupEntry,
    SchemaGroupListResponse,
    SchemaMWPASessionData,
    RightGroups,
} from 'mwpa_schemas';
import {defaultMWPASessionInit} from '../SessionDefault.js';
import {List} from './Group/List.js';
import {Save} from './Group/Save.js';

/**
 * Group
 */
export class Group extends DefaultRoute {

    /**
     * Return the express router
     * @returns {Router}
     */
    public getExpressRouter(): Router {
        this._get(
            '/json/group/list',
            checkMWPAUserIsLoginACL,
            async(): Promise<GroupListResponse> => {
                return List.getList();
            },
            {
                description: '.',
                aclRight: RightGroups.groups_read,
                responseBodySchema: SchemaGroupListResponse
            }
        );

        this._post(
            '/json/group/save',
            checkMWPAUserIsLoginACL,
            async(_req, _res, data): Promise<DefaultReturn> => {
                if (!data.session?.user?.isAdmin) {
                    return {
                        statusCode: StatusCodes.FORBIDDEN
                    };
                }
                return Save.saveGroup(data.body);
            },
            {
                description: 'Insert or update a user group (admin only). Writes organization_id + role verbatim.',
                aclRight: RightGroups.groups_write,
                bodySchema: SchemaGroupEntry,
                responseBodySchema: SchemaDefaultReturn,
                sessionSchema: SchemaMWPASessionData,
                sessionInit: defaultMWPASessionInit
            }
        );

        return super.getExpressRouter();
    }

}