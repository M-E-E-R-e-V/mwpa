import {Router} from 'express';
import {DefaultRoute} from 'figtree';
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
            true,
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