import {Router} from 'express';
import {DefaultRoute} from 'figtree';
import {
    SchemaToursFilter,
    SchemaToursListResponse,
    SchemaToursTrackingRequest,
    SchemaToursTrackingResponse,
    ToursListResponse,
    ToursTrackingResponse
} from 'mwpa_schemas';
import {checkMWPAUserIsLogin} from '../AuthCheck.js';
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
                return List.getList(data.body);
            },
            {
                description: 'Paginated tour list with device + creater lookups.',
                bodySchema: SchemaToursFilter,
                responseBodySchema: SchemaToursListResponse
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