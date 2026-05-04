import {Router} from 'express';
import {DefaultRoute} from 'figtree';
import {DefaultReturn, SchemaDefaultReturn, StatusCodes} from 'figtree-schemas';
import {
    SchemaMWPASessionData,
    SchemaSightingDeleteRequest,
    SchemaSightingImageGetRequest,
    SchemaSightingsFilter,
    SchemaSightingsListResponse,
    SightingsListResponse
} from 'mwpa_schemas';
import {checkMWPAUserIsLogin} from '../AuthCheck.js';
import {defaultMWPASessionInit} from '../SessionDefault.js';
import {Delete} from './Sightings/Delete.js';
import {Excel} from './Sightings/Excel.js';
import {GetImage} from './Sightings/GetImage.js';
import {List} from './Sightings/List.js';

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
            async(_req, res, data) => {
                await GetImage.serveImage(data.params!, res);
            },
            {
                description: 'Serve a sighting image file.',
                pathSchema: SchemaSightingImageGetRequest
            }
        );

        this._get(
            '/json/sightings/list/excel',
            checkMWPAUserIsLogin,
            async(_req, res, data) => {
                if (!data.session?.user?.isAdmin) {
                    res.status(parseInt(StatusCodes.FORBIDDEN, 10)).send('Forbidden');
                    return;
                }

                const buffer = await Excel.build();

                res.setHeader('Content-Type', 'application/octet-stream');
                res.setHeader('Content-Disposition', `attachment; filename="${EXCEL_DOWNLOAD_NAME}"`);
                res.end(buffer);
            },
            {
                description: 'Download all non-deleted sightings as XLSX (admin only).',
                sessionSchema: SchemaMWPASessionData,
                sessionInit: defaultMWPASessionInit
            }
        );

        return super.getExpressRouter();
    }

}
