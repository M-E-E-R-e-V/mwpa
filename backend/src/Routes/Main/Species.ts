import {Router} from 'express';
import multer from 'multer';
import {DefaultRoute} from '@stefanwerfling/figtree';
import {
    DefaultHandlerReturn,
    DefaultReturn,
    HandlerResultType,
    SchemaDefaultReturn,
    StatusCodes
} from 'figtree-schemas';
import {
    SchemaMWPASessionData,
    SchemaSpeciesDeleteRequest,
    SchemaSpeciesEntry,
    SchemaSpeciesImageGetRequest,
    SchemaSpeciesListResponse,
    SchemaSpeciesMergeRequest,
    SchemaSpeciesProfileRequest,
    SchemaSpeciesProfileResponse,
    SchemaSpeciesRegressionMatrixResponse,
    SchemaSpeciesRegressionRequest,
    SpeciesListResponse,
    SpeciesProfileResponse,
    SpeciesRegressionMatrixResponse,
    RightAnalytics,
    RightSpecies,
} from 'mwpa_schemas';
import {Users} from '../../Users/Users.js';
import {checkMWPAUserIsLoginACL} from '../AuthCheck.js';
import {defaultMWPASessionInit} from '../SessionDefault.js';
import {Lookup} from './Lookup.js';
import {Delete} from './Species/Delete.js';
import {Image} from './Species/Image.js';
import {List} from './Species/List.js';
import {Merge} from './Species/Merge.js';
import {Profile} from './Species/Profile.js';
import {Regression} from './Species/Regression.js';
import {Save} from './Species/Save.js';

/**
 * Multipart parser for the species image upload (memory, size-capped).
 */
const speciesImageUpload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: Image.MAX_SIZE,
        files: 1
    }
});

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
            checkMWPAUserIsLoginACL,
            async(): Promise<SpeciesListResponse> => {
                return List.getList();
            },
            {
                description: 'Return a list of species joined with their species group.',
                aclRight: RightSpecies.species_read,
                responseBodySchema: SchemaSpeciesListResponse
            }
        );

        this._post(
            '/json/species/save',
            checkMWPAUserIsLoginACL,
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
                aclRight: RightSpecies.species_write,
                bodySchema: SchemaSpeciesEntry,
                responseBodySchema: SchemaDefaultReturn,
                sessionSchema: SchemaMWPASessionData,
                sessionInit: defaultMWPASessionInit,
            }
        );

        this._post(
            '/json/species/merge',
            checkMWPAUserIsLoginACL,
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
                aclRight: RightSpecies.species_write,
                bodySchema: SchemaSpeciesMergeRequest,
                responseBodySchema: SchemaDefaultReturn,
                sessionSchema: SchemaMWPASessionData,
                sessionInit: defaultMWPASessionInit,
            }
        );

        this._post(
            '/json/species/regression-matrix',
            checkMWPAUserIsLoginACL,
            async(_req, _res, data): Promise<SpeciesRegressionMatrixResponse> => {
                const userId = data.session?.user?.userid ?? 0;
                const isAdmin = data.session?.user?.isAdmin ?? false;
                const orgIds = isAdmin ? undefined : await Users.getOrganizationIds(userId);
                return Regression.getMatrix(data.body, orgIds);
            },
            {
                description: 'Cross-species regression matrix (Year×SPUE, SST×group-size, Chl-a×group-size, effort saturation) — per-species + pooled OLS fits to surface Simpson-paradox effects.',
                aclRight: RightAnalytics.analytics_read,
                bodySchema: SchemaSpeciesRegressionRequest,
                responseBodySchema: SchemaSpeciesRegressionMatrixResponse,
                sessionSchema: SchemaMWPASessionData,
                sessionInit: defaultMWPASessionInit
            }
        );

        this._post(
            '/json/species/profile',
            checkMWPAUserIsLoginACL,
            async(_req, _res, data): Promise<SpeciesProfileResponse> => {
                const userId = data.session?.user?.userid ?? 0;
                const isAdmin = data.session?.user?.isAdmin ?? false;
                const orgIds = isAdmin ? undefined : await Users.getOrganizationIds(userId);
                return Profile.getProfile(data.body, orgIds);
            },
            {
                description: 'Aggregated per-species profile (counts, group-size hist, env distributions). Org-scoped for non-admins via vehicle.organization_id.',
                aclRight: RightAnalytics.analytics_read,
                bodySchema: SchemaSpeciesProfileRequest,
                responseBodySchema: SchemaSpeciesProfileResponse,
                sessionSchema: SchemaMWPASessionData,
                sessionInit: defaultMWPASessionInit
            }
        );

        this._post(
            '/json/species/delete',
            checkMWPAUserIsLoginACL,
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
                aclRight: RightSpecies.species_delete,
                bodySchema: SchemaSpeciesDeleteRequest,
                responseBodySchema: SchemaDefaultReturn,
                sessionSchema: SchemaMWPASessionData,
                sessionInit: defaultMWPASessionInit,
            }
        );

        this._post(
            '/json/species/image/upload',
            checkMWPAUserIsLoginACL,
            async(req, _res, data): Promise<DefaultReturn> => {
                if (!data.session?.user?.isAdmin) {
                    return {
                        statusCode: StatusCodes.FORBIDDEN
                    };
                }

                // multer attaches `req.file`; the species id comes as form field.
                const file = (req as unknown as {file?: {buffer: Buffer;};}).file;
                const body = (req.body ?? {}) as {id?: string;};

                return Image.save(parseInt(body.id ?? '', 10), file?.buffer);
            },
            {
                description: 'Upload the image of a species (multipart form-data: field "file" = PNG/JPEG/GIF/WebP up to 5 MB, field "id" = species id). Replaces a previous image (admin only).',
                aclRight: RightSpecies.species_write,
                responseBodySchema: SchemaDefaultReturn,
                sessionSchema: SchemaMWPASessionData,
                sessionInit: defaultMWPASessionInit,
                parser: speciesImageUpload.single('file')
            }
        );

        this._post(
            '/json/species/image/delete',
            checkMWPAUserIsLoginACL,
            async(_req, _res, data): Promise<DefaultReturn> => {
                if (!data.session?.user?.isAdmin) {
                    return {
                        statusCode: StatusCodes.FORBIDDEN
                    };
                }
                return Image.remove(data.body);
            },
            {
                description: 'Remove the image of a species — the UI falls back to the built-in silhouette (admin only).',
                aclRight: RightSpecies.species_write,
                bodySchema: SchemaSpeciesDeleteRequest,
                responseBodySchema: SchemaDefaultReturn,
                sessionSchema: SchemaMWPASessionData,
                sessionInit: defaultMWPASessionInit,
            }
        );

        this._get(
            '/json/species/image/:id/:filename',
            async(req, res): Promise<boolean> => Lookup.checkAnyRight(req, res, [
                ...Lookup.LOOKUP_RIGHTS,
                RightSpecies.species_read
            ]),
            async(_req, res, data): Promise<DefaultHandlerReturn> => {
                await Image.serve(data.params!, res);
                return {type: HandlerResultType.handled};
            },
            {
                description: 'Serve the uploaded image of a species (needs species_read or one of the working-page rights, like the /json/lookup/* routes).',
                pathSchema: SchemaSpeciesImageGetRequest
            }
        );

        return super.getExpressRouter();
    }

}
