import {Router} from 'express';
import {DefaultRoute} from 'figtree';
import {checkMWPAUserIsLogin} from '../AuthCheck.js';
import {DefaultReturn, SchemaDefaultReturn} from 'figtree-schemas';
import {GroupListResponse, SchemaGroupEntry, SchemaGroupListResponse} from 'mwpa_schemas';
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
            checkMWPAUserIsLogin,
            async(): Promise<GroupListResponse> => {
                return List.getList();
            },
            {
                description: '.',
                responseBodySchema: SchemaGroupListResponse
            }
        );

        // TODO only for admins
        this._post(
            '/json/group/save',
            checkMWPAUserIsLogin,
            async(_req, _res, data): Promise<DefaultReturn> => {
                return Save.saveGroup(data.body);
            },
            {
                description: '.',
                bodySchema: SchemaGroupEntry,
                responseBodySchema: SchemaDefaultReturn
            }
        );

        return super.getExpressRouter();
    }

}