import {Router} from 'express';
import {DefaultRoute} from 'figtree';
import {StatusCodes} from 'figtree-schemas';
import {
    EarthquakeImportResponse,
    EarthquakeListResponse,
    EarthquakeRecorrelateResponse,
    SchemaEarthquakeFilter,
    SchemaEarthquakeImportRequest,
    SchemaEarthquakeImportResponse,
    SchemaEarthquakeListResponse,
    SchemaEarthquakeRecorrelateResponse,
    SchemaMWPASessionData
} from 'mwpa_schemas';
import {checkMWPAUserIsLogin} from '../AuthCheck.js';
import {defaultMWPASessionInit} from '../SessionDefault.js';
import {Import} from './Earthquake/Import.js';
import {List} from './Earthquake/List.js';
import {Recorrelate} from './Earthquake/Recorrelate.js';

/**
 * Earthquake
 *
 * Admin routes around the seismic ingest pipeline. The list endpoint is
 * read-only and session-only; the import trigger is admin-only — non-
 * admins still get a 200 with a FORBIDDEN status so the frontend can
 * present a clean error.
 */
export class Earthquake extends DefaultRoute {

    public getExpressRouter(): Router {

        this._post(
            '/json/earthquake/list',
            checkMWPAUserIsLogin,
            async(_req, _res, data): Promise<EarthquakeListResponse> => {
                return List.getList(data.body);
            },
            {
                description: 'Paginated list of imported earthquakes — period + min-magnitude filter.',
                bodySchema: SchemaEarthquakeFilter,
                responseBodySchema: SchemaEarthquakeListResponse,
                sessionSchema: SchemaMWPASessionData,
                sessionInit: defaultMWPASessionInit
            }
        );

        this._get(
            '/json/earthquake/recorrelate',
            checkMWPAUserIsLogin,
            async(_req, _res, data): Promise<EarthquakeRecorrelateResponse> => {
                if (!data.session?.user?.isAdmin) {
                    return {statusCode: StatusCodes.FORBIDDEN, msg: 'Admin only'};
                }
                return Recorrelate.run();
            },
            {
                description: 'Walks every earthquake in the local table and re-writes the sighting_seismic correlation — use after a wide backfill or radius change (admin only). State-changing despite GET because the admin triggers it from the browser; idempotent.',
                responseBodySchema: SchemaEarthquakeRecorrelateResponse,
                sessionSchema: SchemaMWPASessionData,
                sessionInit: defaultMWPASessionInit
            }
        );

        this._post(
            '/json/earthquake/import',
            checkMWPAUserIsLogin,
            async(_req, _res, data): Promise<EarthquakeImportResponse> => {
                if (!data.session?.user?.isAdmin) {
                    return {statusCode: StatusCodes.FORBIDDEN, msg: 'Admin only'};
                }
                return Import.runImport(data.body);
            },
            {
                description: 'Manually run the USGS earthquake import (admin only). Optional backfill_from for a date-range refresh.',
                bodySchema: SchemaEarthquakeImportRequest,
                responseBodySchema: SchemaEarthquakeImportResponse,
                sessionSchema: SchemaMWPASessionData,
                sessionInit: defaultMWPASessionInit
            }
        );

        return super.getExpressRouter();
    }

}