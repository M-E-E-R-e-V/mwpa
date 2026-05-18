import {Router} from 'express';
import {DefaultRoute} from 'figtree';
import {
    SchemaMWPASessionData,
    SchemaToursFilter,
    SchemaToursListResponse,
    SchemaToursTrackingRequest,
    SchemaToursTrackingResponse,
    ToursListResponse,
    ToursTrackingResponse
} from 'mwpa_schemas';
import {checkMWPAUserIsLogin} from '../AuthCheck.js';
import {defaultMWPASessionInit} from '../SessionDefault.js';
import {List} from './Tours/List.js';
import {Tracking} from './Tours/Tracking.js';

/**
 * Tours
 */
export class Tours extends DefaultRoute {

    /**
     * Return the express router
     * @returns {Router}
     */
    public getExpressRouter(): Router {

        this._post(
            '/json/tours/list',
            checkMWPAUserIsLogin,
            async(_req, _res, data): Promise<ToursListResponse> => {
                const userId = data.session?.user?.userid ?? 0;
                const isAdmin = data.session?.user?.isAdmin ?? false;
                return List.getList(userId, isAdmin, data.body);
            },
            {
                description: 'Paginated tour list (org-scoped for non-admins) with device + creater lookups and per-tour sighting/tracking counts. Filterable by period_from/to, vehicle_id, vehicle_driver_id, organization_id, free-text search.',
                bodySchema: SchemaToursFilter,
                responseBodySchema: SchemaToursListResponse,
                sessionSchema: SchemaMWPASessionData,
                sessionInit: defaultMWPASessionInit
            }
        );

        this._post(
            '/json/tours/tracking/list',
            checkMWPAUserIsLogin,
            async(_req, _res, data): Promise<ToursTrackingResponse> => {
                return Tracking.getTracking(data.body);
            },
            {
                description: 'Tracking points + sightings + image filenames for a tour.',
                bodySchema: SchemaToursTrackingRequest,
                responseBodySchema: SchemaToursTrackingResponse
            }
        );

        return super.getExpressRouter();
    }

}