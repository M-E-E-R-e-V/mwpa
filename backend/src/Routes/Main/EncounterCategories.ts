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
            '/json/encountercategories/list',
            checkMWPAUserIsLogin,
            async() => List.getList(),
            {
                description: 'List of encounter categories.',
                responseBodySchema: SchemaEncounterCategoriesResponse
            }
        );

        return super.getExpressRouter();
    }

}