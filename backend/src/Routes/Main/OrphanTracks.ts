import {Router} from 'express';
import {DefaultRoute} from '@stefanwerfling/figtree';
import {
    OrphanTracksAssignResponse,
    OrphanTracksDeleteResponse,
    OrphanTracksListResponse,
    OrphanTracksMatchResponse,
    OrphanTracksPointsResponse,
    SchemaMWPASessionData,
    SchemaOrphanTracksAssignRequest,
    SchemaOrphanTracksAssignResponse,
    SchemaOrphanTracksDeleteRequest,
    SchemaOrphanTracksDeleteResponse,
    SchemaOrphanTracksFilter,
    SchemaOrphanTracksListResponse,
    SchemaOrphanTracksMatchRequest,
    SchemaOrphanTracksMatchResponse,
    SchemaOrphanTracksPointsRequest,
    SchemaOrphanTracksPointsResponse,
    RightTours,
} from 'mwpa_schemas';
import {checkMWPAUserIsLoginACL} from '../AuthCheck.js';
import {defaultMWPASessionInit} from '../SessionDefault.js';
import {Assign} from './OrphanTracks/Assign.js';
import {Delete} from './OrphanTracks/Delete.js';
import {List} from './OrphanTracks/List.js';
import {Match} from './OrphanTracks/Match.js';
import {Points} from './OrphanTracks/Points.js';

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
            checkMWPAUserIsLoginACL,
            async(_req, _res, data): Promise<OrphanTracksListResponse> => {
                const userId = data.session?.user?.userid ?? 0;
                const isAdmin = data.session?.user?.isAdmin ?? false;
                return List.getList(userId, isAdmin, data.body);
            },
            {
                aclRight: RightTours.tours_write,
                description: 'List distinct (tour_fid, device_id) pending-track buckets that have no matching SightingTour. Admin-only.',
                bodySchema: SchemaOrphanTracksFilter,
                responseBodySchema: SchemaOrphanTracksListResponse,
                sessionSchema: SchemaMWPASessionData,
                sessionInit: defaultMWPASessionInit
            }
        );

        this._post(
            '/json/orphantracks/match',
            checkMWPAUserIsLoginACL,
            async(_req, _res, data): Promise<OrphanTracksMatchResponse> => {
                const userId = data.session?.user?.userid ?? 0;
                const isAdmin = data.session?.user?.isAdmin ?? false;
                return Match.getMatches(userId, isAdmin, data.body);
            },
            {
                aclRight: RightTours.tours_write,
                description: 'Find candidate SightingTour rows matching the four pickers (vehicle, driver, date, tour_start). Admin-only.',
                bodySchema: SchemaOrphanTracksMatchRequest,
                responseBodySchema: SchemaOrphanTracksMatchResponse,
                sessionSchema: SchemaMWPASessionData,
                sessionInit: defaultMWPASessionInit
            }
        );

        this._post(
            '/json/orphantracks/assign',
            checkMWPAUserIsLoginACL,
            async(_req, _res, data): Promise<OrphanTracksAssignResponse> => {
                const userId = data.session?.user?.userid ?? 0;
                const isAdmin = data.session?.user?.isAdmin ?? false;
                return Assign.assign(userId, isAdmin, data.body);
            },
            {
                aclRight: RightTours.tours_write,
                description: 'Promote the pending-track bucket for (tour_fid, device_id) into the chosen target tour. Admin-only.',
                bodySchema: SchemaOrphanTracksAssignRequest,
                responseBodySchema: SchemaOrphanTracksAssignResponse,
                sessionSchema: SchemaMWPASessionData,
                sessionInit: defaultMWPASessionInit
            }
        );

        this._post(
            '/json/orphantracks/points',
            checkMWPAUserIsLoginACL,
            async(_req, _res, data): Promise<OrphanTracksPointsResponse> => {
                return Points.getPoints(data.body);
            },
            {
                aclRight: RightTours.tours_write,
                description: 'Decoded lat/lon/ts points for one orphan bucket — drives the map preview in the AssignModal. Admin-only.',
                bodySchema: SchemaOrphanTracksPointsRequest,
                responseBodySchema: SchemaOrphanTracksPointsResponse,
                sessionSchema: SchemaMWPASessionData,
                sessionInit: defaultMWPASessionInit
            }
        );

        this._post(
            '/json/orphantracks/delete',
            checkMWPAUserIsLoginACL,
            async(_req, _res, data): Promise<OrphanTracksDeleteResponse> => {
                return Delete.drop(data.body);
            },
            {
                aclRight: RightTours.tours_write,
                description: 'Drop the pending-track bucket for (tour_fid, device_id) without promoting — used when the admin judges the orphan as junk. Admin-only.',
                bodySchema: SchemaOrphanTracksDeleteRequest,
                responseBodySchema: SchemaOrphanTracksDeleteResponse,
                sessionSchema: SchemaMWPASessionData,
                sessionInit: defaultMWPASessionInit
            }
        );

        return super.getExpressRouter();
    }

}