import {Router} from 'express';
import {DefaultRoute} from '@stefanwerfling/figtree';
import {checkMWPAUserIsLoginACL} from '../AuthCheck.js';
import {
    SchemaBehaviouralStatesResponse,
    RightCatalog,
} from 'mwpa_schemas';
import {List} from './BehaviouralStates/List.js';

/**
 * Behavioural states
 */
export class BehaviouralStates extends DefaultRoute {

    /**
     * Return the express router
     * @returns {Router}
     */
    public getExpressRouter(): Router {

        this._get(
            '/json/behaviouralstates/list',
            checkMWPAUserIsLoginACL,
            async() => {
                return List.getList();
            },
            {
                description: '.',
                aclRight: RightCatalog.catalog_read,
                responseBodySchema: SchemaBehaviouralStatesResponse
            }
        );

        return super.getExpressRouter();
    }

}