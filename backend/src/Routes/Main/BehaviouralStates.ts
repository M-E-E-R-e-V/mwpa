import {Router} from 'express';
import {DefaultRoute} from 'figtree';
import {SchemaBehaviouralStatesResponse} from 'mwpa_schemas';
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
            true,
            async() => {
                return List.getList();
            },
            {
                description: '.',
                responseBodySchema: SchemaBehaviouralStatesResponse
            }
        );

        return super.getExpressRouter();
    }

}