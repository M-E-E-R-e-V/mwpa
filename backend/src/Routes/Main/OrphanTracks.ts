import {Router} from 'express';
import {DefaultRoute} from 'figtree';
import {
    OrphanTracksAssignResponse,
    OrphanTracksListResponse,
    OrphanTracksMatchResponse,
    SchemaMWPASessionData,
    SchemaOrphanTracksAssignRequest,
    SchemaOrphanTracksAssignResponse,
    SchemaOrphanTracksFilter,
    SchemaOrphanTracksListResponse,
    SchemaOrphanTracksMatchRequest,
    SchemaOrphanTracksMatchResponse
} from 'mwpa_schemas';
import {checkMWPAAdminIsLogin} from '../AuthCheck.js';
import {defaultMWPASessionInit} from '../SessionDefault.js';
import {Assign} from './OrphanTracks/Assign.js';
import {List} from './OrphanTracks/List.js';
import {Match} from './OrphanTracks/Match.js';

/**
 * OrphanTracks
 */
export class OrphanTracks extends DefaultRoute {

    /**
     * Return the express router
     * @returns {Router}
     */
    public getExpressRouter(): Router {

        this._post(
            '/json/orphantracks/list',
            checkMWPAAdminIsLogin,
            async(_req, _res, data): Promise<OrphanTracksListResponse> => {
                const userId = data.session?.user?.userid ?? 0;
                const isAdmin = data.session?.user?.isAdmin ?? false;
                return List.getList(userId, isAdmin, data.body);
            },
            {
                description: 'List distinct (tour_fid, device_id) pending-track buckets that have no matching SightingTour. Admin-only.',
                bodySchema: SchemaOrphanTracksFilter,
                responseBodySchema: SchemaOrphanTracksListResponse,
                sessionSchema: SchemaMWPASessionData,
                sessionInit: defaultMWPASessionInit
            }
        );

        this._post(
            '/json/orphantracks/match',
            checkMWPAAdminIsLogin,
            async(_req, _res, data): Promise<OrphanTracksMatchResponse> => {
                const userId = data.session?.user?.userid ?? 0;
                const isAdmin = data.session?.user?.isAdmin ?? false;
                return Match.getMatches(userId, isAdmin, data.body);
            },
            {
                description: 'Find candidate SightingTour rows matching the four pickers (vehicle, driver, date, tour_start). Admin-only.',
                bodySchema: SchemaOrphanTracksMatchRequest,
                responseBodySchema: SchemaOrphanTracksMatchResponse,
                sessionSchema: SchemaMWPASessionData,
                sessionInit: defaultMWPASessionInit
            }
        );

        this._post(
            '/json/orphantracks/assign',
            checkMWPAAdminIsLogin,
            async(_req, _res, data): Promise<OrphanTracksAssignResponse> => {
                const userId = data.session?.user?.userid ?? 0;
                const isAdmin = data.session?.user?.isAdmin ?? false;
                return Assign.assign(userId, isAdmin, data.body);
            },
            {
                description: 'Promote the pending-track bucket for (tour_fid, device_id) into the chosen target tour. Admin-only.',
                bodySchema: SchemaOrphanTracksAssignRequest,
                responseBodySchema: SchemaOrphanTracksAssignResponse,
                sessionSchema: SchemaMWPASessionData,
                sessionInit: defaultMWPASessionInit
            }
        );

        return super.getExpressRouter();
    }

}