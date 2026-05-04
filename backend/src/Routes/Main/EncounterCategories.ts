import {Router} from 'express';
import {DefaultRoute} from 'figtree';
import {checkMWPAUserIsLogin} from '../AuthCheck.js';
import {SchemaEncounterCategoriesResponse} from 'mwpa_schemas';
import {List} from './EncounterCategories/List.js';

/**
 * Encounter categories
 */
export class EncounterCategories extends DefaultRoute {

    /**
     * Return the express router
     * @returns {Router}
     */
    public getExpressRouter(): Router {
        this._get(
            '/json/behaviouralstates/list',
            checkMWPAUserIsLogin,
            async() => {
                return List.getList();
            },
            {
                description: '.',
                responseBodySchema: SchemaEncounterCategoriesResponse
            }
        );

        return super.getExpressRouter();
    }

}