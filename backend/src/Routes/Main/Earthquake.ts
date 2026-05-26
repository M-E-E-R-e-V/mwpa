import {Router} from 'express';
import {DefaultRoute} from 'figtree';
import {StatusCodes} from 'figtree-schemas';
import {
    EarthquakeImpactResponse,
    EarthquakeListResponse,
    EarthquakeRecorrelateResponse,
    SchemaEarthquakeFilter,
    SchemaEarthquakeImpactRequest,
    SchemaEarthquakeImpactResponse,
    SchemaEarthquakeListResponse,
    SchemaEarthquakeRecorrelateResponse,
    SchemaMWPASessionData
} from 'mwpa_schemas';
import {checkMWPAUserIsLogin} from '../AuthCheck.js';
import {defaultMWPASessionInit} from '../SessionDefault.js';
import {Impact} from './Earthquake/Impact.js';
import {List} from './Earthquake/List.js';
import {Recorrelate} from './Earthquake/Recorrelate.js';

/**
 * Earthquake
 *
 * Admin routes around the seismic ingest pipeline. The list endpoint is
 * read-only and session-only; recorrelate is admin-only — non-admins
 * still get a 200 with a FORBIDDEN status so the frontend can present a
 * clean error. Import has no UI trigger: the hourly cron handles it,
 * cold-starting from the oldest sighting date minus 30 days.
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
            '/json/earthquake/impact',
            checkMWPAUserIsLogin,
            async(_req, _res, data): Promise<EarthquakeImpactResponse> => {
                if (!data.session?.user?.isAdmin) {
                    return {statusCode: StatusCodes.FORBIDDEN, msg: 'Admin only'};
                }
                return Impact.run(data.body);
            },
            {
                description: 'Affected sightings for an earthquake (by id) or a UTC day, within ±window_days. Returns enriched sighting rows, movement tracks per sighting, and 4 aggregate buckets for the Auswertung card (admin only).',
                bodySchema: SchemaEarthquakeImpactRequest,
                responseBodySchema: SchemaEarthquakeImpactResponse,
                sessionSchema: SchemaMWPASessionData,
                sessionInit: defaultMWPASessionInit
            }
        );

        return super.getExpressRouter();
    }

}