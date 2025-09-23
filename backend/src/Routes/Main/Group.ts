import {Router} from 'express';
import {DefaultRoute, SchemaDefaultReturn} from 'figtree';
import {GroupEntry, SchemaGroupEntry, SchemaGroupListResponse} from 'mwpa_schemas';
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
            true,
            async() => {
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
            true,
            async(request, response, data) => {
                return Save.saveGroup(data.body as GroupEntry);
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