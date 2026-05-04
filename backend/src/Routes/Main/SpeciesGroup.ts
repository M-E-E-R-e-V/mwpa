import {Router} from 'express';
import {DefaultRoute} from 'figtree';
import {checkMWPAUserIsLogin} from '../AuthCheck.js';
import {SchemaSpeciesGroupListResponse, SpeciesGroupListResponse} from 'mwpa_schemas';
import {List} from './SpeciesGroup/List.js';

/**
 * SpeciesGroup
 */
export class SpeciesGroup extends DefaultRoute {

    /**
     * Return the express router
     * @returns {Router}
     */
    public getExpressRouter(): Router {

        this._get(
            '/json/speciesgroup/list',
            checkMWPAUserIsLogin,
            async(): Promise<SpeciesGroupListResponse> => {
                return List.getList();
            },
            {
                description: 'Return a list of species groups.',
                responseBodySchema: SchemaSpeciesGroupListResponse
            }
        );

        return super.getExpressRouter();
    }

}