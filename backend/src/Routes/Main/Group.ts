import {Router} from 'express';
import {DefaultRoute} from '@stefanwerfling/figtree';
import {checkMWPAUserIsLoginACL} from '../AuthCheck.js';
import {DefaultReturn, SchemaDefaultReturn} from 'figtree-schemas';
import {
    GroupListResponse,
    SchemaGroupEntry,
    SchemaGroupListResponse,
    RightGroups,
} from 'mwpa_schemas';
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

        // TODO only for admins
        this._post(
            '/json/group/save',
            checkMWPAUserIsLoginACL,
            async(_req, _res, data): Promise<DefaultReturn> => {
                return Save.saveGroup(data.body);
            },
            {
                description: '.',
                aclRight: RightGroups.groups_write,
                bodySchema: SchemaGroupEntry,
                responseBodySchema: SchemaDefaultReturn
            }
        );

        return super.getExpressRouter();
    }

}