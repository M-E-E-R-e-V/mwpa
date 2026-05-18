import {Router} from 'express';
import {DefaultRoute} from 'figtree';
import {DefaultHandlerReturn, DefaultReturn, HandlerResultType, SchemaDefaultReturn, StatusCodes} from 'figtree-schemas';
import {
    RightSightings,
    SchemaMWPASessionData,
    SchemaSightingDeleteRequest,
    SchemaSightingEnvironmentListResponse,
    SchemaSightingImageGetRequest,
    SchemaSightingSaveRequest,
    SchemaSightingYearsResponse,
    SchemaSightingsFilter,
    SchemaSightingsListResponse,
    SightingEnvironmentListResponse,
    SightingYearsResponse,
    SightingsListResponse
} from 'mwpa_schemas';
import {checkMWPAUserIsLogin, checkMWPAUserIsLoginACL} from '../AuthCheck.js';
import {defaultMWPASessionInit} from '../SessionDefault.js';
import {Delete} from './Sightings/Delete.js';
import {Environment} from './Sightings/Environment.js';
import {Excel} from './Sightings/Excel.js';
import {GetImage} from './Sightings/GetImage.js';
import {List} from './Sightings/List.js';
import {Save} from './Sightings/Save.js';
import {Years} from './Sightings/Years.js';

const EXCEL_DOWNLOAD_NAME = 'sightings_list.xlsx';

/**
 * Sightings
 */
export class Sightings extends DefaultRoute {

    /**
     * Return the express router
     * @returns {Router}
     */
    public getExpressRouter(): Router {

        this._post(
            '/json/sightings/list',
            checkMWPAUserIsLogin,
            async(_req, _res, data): Promise<SightingsListResponse> => {
                const userId = data.session?.user?.userid ?? 0;
                const isAdmin = data.session?.user?.isAdmin ?? false;
                return List.getList(userId, isAdmin, data.body);
            },
            {
                description: 'Paginated list of non-deleted sightings (org-scoped for non-admins).',
                bodySchema: SchemaSightingsFilter,
                responseBodySchema: SchemaSightingsListResponse,
                sessionSchema: SchemaMWPASessionData,
                sessionInit: defaultMWPASessionInit,
            }
        );

        this._post(
            '/json/sightings/environment/list',
            checkMWPAUserIsLogin,
            async(_req, _res, data): Promise<SightingEnvironmentListResponse> => {
                const userId = data.session?.user?.userid ?? 0;
                const isAdmin = data.session?.user?.isAdmin ?? false;
                return Environment.getList(userId, isAdmin, data.body);
            },
            {
                description: 'Paginated list of non-deleted sightings joined with ocean (chl-a, salinity, currents) + GFW fishing-effort enrichment columns. Position is denormalised to lon/lat for direct map use.',
                bodySchema: SchemaSightingsFilter,
                responseBodySchema: SchemaSightingEnvironmentListResponse,
                sessionSchema: SchemaMWPASessionData,
                sessionInit: defaultMWPASessionInit,
            }
        );

        this._post(
            '/json/sightings/save',
            checkMWPAUserIsLoginACL,
            async(_req, _res, data): Promise<DefaultReturn> => {
                return Save.save(data.body);
            },
            {
                description: 'Update an existing sighting. Gated by RightSightings.sightings_write.',
                aclRight: RightSightings.sightings_write,
                bodySchema: SchemaSightingSaveRequest,
                responseBodySchema: SchemaDefaultReturn,
                sessionSchema: SchemaMWPASessionData,
                sessionInit: defaultMWPASessionInit,
            }
        );

        this._post(
            '/json/sightings/delete',
            checkMWPAUserIsLogin,
            async(_req, _res, data): Promise<DefaultReturn> => {
                if (!data.session?.user?.isAdmin) {
                    return {
                        statusCode: StatusCodes.FORBIDDEN
                    };
                }
                return Delete.deleteSighting(data.body);
            },
            {
                description: 'Soft-delete a sighting (admin only).',
                bodySchema: SchemaSightingDeleteRequest,
                responseBodySchema: SchemaDefaultReturn,
                sessionSchema: SchemaMWPASessionData,
                sessionInit: defaultMWPASessionInit,
            }
        );

        this._get(
            '/json/sightings/getimage/:id/:filename',
            checkMWPAUserIsLogin,
            async(_req, res, data): Promise<DefaultHandlerReturn> => {
                await GetImage.serveImage(data.params!, res);
                return {type: HandlerResultType.handled};
            },
            {
                description: 'Serve a sighting image file.',
                pathSchema: SchemaSightingImageGetRequest
            }
        );

        this._get(
            '/json/sightings/years',
            checkMWPAUserIsLogin,
            async(): Promise<SightingYearsResponse> => {
                return Years.getYears();
            },
            {
                description: 'Distinct calendar years (DESC) found in non-deleted sightings.'
                    + ' Feeds the Excel-Report year picker in the SightingExport widget.',
                responseBodySchema: SchemaSightingYearsResponse,
                sessionSchema: SchemaMWPASessionData,
                sessionInit: defaultMWPASessionInit,
            }
        );

        this._get(
            '/json/sightings/list/excel',
            checkMWPAUserIsLogin,
            async(req, res, data): Promise<DefaultHandlerReturn> => {
                if (!data.session?.user?.isAdmin) {
                    res.status(parseInt(StatusCodes.FORBIDDEN, 10)).send('Forbidden');
                    return {type: HandlerResultType.handled};
                }

                const buffer = await Excel.build({
                    columns: Excel.parseColumns(req.query.columns),
                    coordFormat: Excel.parseCoordFormat(req.query.coord_format),
                    filter: Excel.parseFilter(req.query)
                });

                res.setHeader('Content-Type', 'application/octet-stream');
                res.setHeader('Content-Disposition', `attachment; filename="${EXCEL_DOWNLOAD_NAME}"`);
                res.end(buffer);
                return {type: HandlerResultType.handled};
            },
            {
                description: 'Download non-deleted sightings as XLSX (admin only).'
                    + ' Query: ?columns=<csv of column keys> picks columns,'
                    + ' ?coord_format=decimal|dms|dm|all picks position-column format.'
                    + ' Filter: ?period_from / ?period_to (YYYY-MM-DD), ?species_id, ?organization_id,'
                    + ' ?vehicle_id, ?vehicle_driver_id, ?search.',
                sessionSchema: SchemaMWPASessionData,
                sessionInit: defaultMWPASessionInit
            }
        );

        return super.getExpressRouter();
    }

}