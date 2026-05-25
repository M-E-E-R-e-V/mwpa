import {Router} from 'express';
import {DefaultRoute} from 'figtree';
import {
    RightTours,
    SchemaMWPASessionData,
    SchemaToursFilter,
    SchemaToursListResponse,
    SchemaToursTrackingDeleteRequest,
    SchemaToursTrackingDeleteResponse,
    SchemaToursTrackingNeighborsRequest,
    SchemaToursTrackingNeighborsResponse,
    SchemaToursTrackingRequest,
    SchemaToursTrackingResponse,
    SchemaToursTrackingTransferRequest,
    SchemaToursTrackingTransferResponse,
    ToursListResponse,
    ToursTrackingDeleteResponse,
    ToursTrackingNeighborsResponse,
    ToursTrackingResponse,
    ToursTrackingTransferResponse
} from 'mwpa_schemas';
import {checkMWPAUserIsLogin, checkMWPAUserIsLoginACL} from '../AuthCheck.js';
import {defaultMWPASessionInit} from '../SessionDefault.js';
import {Delete} from './Tours/Delete.js';
import {List} from './Tours/List.js';
import {Neighbors} from './Tours/Neighbors.js';
import {Tracking} from './Tours/Tracking.js';
import {Transfer} from './Tours/Transfer.js';

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

        this._post(
            '/json/tours/tracking/neighbors',
            checkMWPAUserIsLogin,
            async(_req, _res, data): Promise<ToursTrackingNeighborsResponse> => {
                return Neighbors.getNeighbors(data.body);
            },
            {
                description: 'Previous/next tour for the same vehicle — used to populate the tracking-edit "transfer to" picker.',
                bodySchema: SchemaToursTrackingNeighborsRequest,
                responseBodySchema: SchemaToursTrackingNeighborsResponse,
                sessionSchema: SchemaMWPASessionData,
                sessionInit: defaultMWPASessionInit
            }
        );

        this._post(
            '/json/tours/tracking/delete',
            checkMWPAUserIsLoginACL,
            async(_req, _res, data): Promise<ToursTrackingDeleteResponse> => {
                return Delete.deleteTrackingRange(data.body);
            },
            {
                description: 'Delete tracking points within a time range from a tour. ACL: tours_tracking_edit.',
                bodySchema: SchemaToursTrackingDeleteRequest,
                responseBodySchema: SchemaToursTrackingDeleteResponse,
                sessionSchema: SchemaMWPASessionData,
                sessionInit: defaultMWPASessionInit,
                aclRight: RightTours.tours_tracking_edit
            }
        );

        this._post(
            '/json/tours/tracking/transfer',
            checkMWPAUserIsLoginACL,
            async(_req, _res, data): Promise<ToursTrackingTransferResponse> => {
                return Transfer.transferTrackingRange(data.body);
            },
            {
                description: 'Transfer tracking points within a time range from one tour to another. ACL: tours_tracking_edit.',
                bodySchema: SchemaToursTrackingTransferRequest,
                responseBodySchema: SchemaToursTrackingTransferResponse,
                sessionSchema: SchemaMWPASessionData,
                sessionInit: defaultMWPASessionInit,
                aclRight: RightTours.tours_tracking_edit
            }
        );

        return super.getExpressRouter();
    }

}