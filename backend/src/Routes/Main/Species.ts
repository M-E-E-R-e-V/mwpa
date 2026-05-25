import {Router} from 'express';
import {DefaultRoute} from 'figtree';
import {DefaultReturn, SchemaDefaultReturn, StatusCodes} from 'figtree-schemas';
import {
    SchemaMWPASessionData,
    SchemaSpeciesDeleteRequest,
    SchemaSpeciesEntry,
    SchemaSpeciesListResponse,
    SchemaSpeciesMergeRequest,
    SchemaSpeciesProfileRequest,
    SchemaSpeciesProfileResponse,
    SpeciesListResponse,
    SpeciesProfileResponse
} from 'mwpa_schemas';
import {Users} from '../../Users/Users.js';
import {checkMWPAUserIsLogin} from '../AuthCheck.js';
import {defaultMWPASessionInit} from '../SessionDefault.js';
import {Delete} from './Species/Delete.js';
import {List} from './Species/List.js';
import {Merge} from './Species/Merge.js';
import {Profile} from './Species/Profile.js';
import {Save} from './Species/Save.js';

/**
 * Species
 */
export class Species extends DefaultRoute {

    /**
     * Return the express router
     * @returns {Router}
     */
    public getExpressRouter(): Router {

        this._get(
            '/json/species/list',
            checkMWPAUserIsLogin,
            async(): Promise<SpeciesListResponse> => {
                return List.getList();
            },
            {
                description: 'Return a list of species joined with their species group.',
                responseBodySchema: SchemaSpeciesListResponse
            }
        );

        this._post(
            '/json/species/save',
            checkMWPAUserIsLogin,
            async(_req, _res, data): Promise<DefaultReturn> => {
                if (!data.session?.user?.isAdmin) {
                    return {
                        statusCode: StatusCodes.FORBIDDEN
                    };
                }
                return Save.saveSpecies(data.body);
            },
            {
                description: 'Insert or update a species (admin only).',
                bodySchema: SchemaSpeciesEntry,
                responseBodySchema: SchemaDefaultReturn,
                sessionSchema: SchemaMWPASessionData,
                sessionInit: defaultMWPASessionInit,
            }
        );

        this._post(
            '/json/species/merge',
            checkMWPAUserIsLogin,
            async(_req, _res, data): Promise<DefaultReturn> => {
                if (!data.session?.user?.isAdmin) {
                    return {
                        statusCode: StatusCodes.FORBIDDEN
                    };
                }
                return Merge.mergeSpecies(data.body);
            },
            {
                description: 'Merge two species: reassign sightings of source to destination, then delete source (admin only).',
                bodySchema: SchemaSpeciesMergeRequest,
                responseBodySchema: SchemaDefaultReturn,
                sessionSchema: SchemaMWPASessionData,
                sessionInit: defaultMWPASessionInit,
            }
        );

        this._post(
            '/json/species/profile',
            checkMWPAUserIsLogin,
            async(_req, _res, data): Promise<SpeciesProfileResponse> => {
                const userId = data.session?.user?.userid ?? 0;
                const isAdmin = data.session?.user?.isAdmin ?? false;
                const orgIds = isAdmin ? undefined : await Users.getOrganizationIds(userId);
                return Profile.getProfile(data.body, orgIds);
            },
            {
                description: 'Aggregated per-species profile (counts, group-size hist, env distributions). Org-scoped for non-admins via vehicle.organization_id.',
                bodySchema: SchemaSpeciesProfileRequest,
                responseBodySchema: SchemaSpeciesProfileResponse,
                sessionSchema: SchemaMWPASessionData,
                sessionInit: defaultMWPASessionInit
            }
        );

        this._post(
            '/json/species/delete',
            checkMWPAUserIsLogin,
            async(_req, _res, data): Promise<DefaultReturn> => {
                if (!data.session?.user?.isAdmin) {
                    return {
                        statusCode: StatusCodes.FORBIDDEN
                    };
                }
                return Delete.deleteSpecies(data.body);
            },
            {
                description: 'Delete a species. Refuses if still referenced by sightings (admin only).',
                bodySchema: SchemaSpeciesDeleteRequest,
                responseBodySchema: SchemaDefaultReturn,
                sessionSchema: SchemaMWPASessionData,
                sessionInit: defaultMWPASessionInit,
            }
        );

        return super.getExpressRouter();
    }

}
