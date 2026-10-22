import {Router} from 'express';
import {DefaultRoute} from '@stefanwerfling/figtree';
import {checkMWPAUserIsLoginACL} from '../AuthCheck.js';
import {
    SchemaSpeciesGroupListResponse,
    SpeciesGroupListResponse,
    RightSpecies,
} from 'mwpa_schemas';
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
            checkMWPAUserIsLoginACL,
            async(): Promise<SpeciesGroupListResponse> => {
                return List.getList();
            },
            {
                description: 'Return a list of species groups.',
                aclRight: RightSpecies.species_read,
                responseBodySchema: SchemaSpeciesGroupListResponse
            }
        );

        return super.getExpressRouter();
    }

}