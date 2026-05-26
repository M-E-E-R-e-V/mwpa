import {
    OrphanTrackEntry,
    OrphanTracksAssignRequest,
    OrphanTracksAssignResponse,
    OrphanTracksDeleteRequest,
    OrphanTracksDeleteResponse,
    OrphanTracksFilter,
    OrphanTracksListResponse,
    OrphanTracksMatchCandidate,
    OrphanTracksMatchRequest,
    OrphanTracksMatchResponse,
    OrphanTracksPoint,
    OrphanTracksPointsRequest,
    OrphanTracksPointsResponse
} from 'mwpa_schemas';
import {NetFetch} from '../Net/NetFetch';
import {UnauthorizedError} from './Error/UnauthorizedError';
import {StatusCodes} from './Status/StatusCodes';

export type {
    OrphanTrackEntry,
    OrphanTracksAssignRequest,
    OrphanTracksAssignResponse,
    OrphanTracksDeleteRequest,
    OrphanTracksDeleteResponse,
    OrphanTracksFilter,
    OrphanTracksListResponse,
    OrphanTracksMatchCandidate,
    OrphanTracksMatchRequest,
    OrphanTracksMatchResponse,
    OrphanTracksPoint,
    OrphanTracksPointsRequest,
    OrphanTracksPointsResponse
};

/**
 * OrphanTracks
 */
export class OrphanTracks {

    /**
     * getList
     */
    public static async getList(filter?: OrphanTracksFilter): Promise<OrphanTracksListResponse|null> {
        const result = await NetFetch.postData('/json/orphantracks/list', filter ?? {});

        if (result && result.statusCode) {
            switch (result.statusCode) {
                case StatusCodes.OK:
                    return result as OrphanTracksListResponse;

                case StatusCodes.UNAUTHORIZED:
                    throw new UnauthorizedError();
            }
        }

        return null;
    }

    /**
     * match
     */
    public static async match(request: OrphanTracksMatchRequest): Promise<OrphanTracksMatchResponse|null> {
        const result = await NetFetch.postData('/json/orphantracks/match', request);

        if (result && result.statusCode) {
            switch (result.statusCode) {
                case StatusCodes.OK:
                    return result as OrphanTracksMatchResponse;

                case StatusCodes.UNAUTHORIZED:
                    throw new UnauthorizedError();
            }
        }

        return null;
    }

    /**
     * assign
     */
    public static async assign(request: OrphanTracksAssignRequest): Promise<OrphanTracksAssignResponse|null> {
        const result = await NetFetch.postData('/json/orphantracks/assign', request);

        if (result && result.statusCode) {
            switch (result.statusCode) {
                case StatusCodes.OK:
                    return result as OrphanTracksAssignResponse;

                case StatusCodes.UNAUTHORIZED:
                    throw new UnauthorizedError();
            }
        }

        return null;
    }

    /**
     * Decoded lat/lon/ts points for one orphan bucket — used by the
     * AssignModal map preview.
     */
    public static async getPoints(request: OrphanTracksPointsRequest): Promise<OrphanTracksPointsResponse|null> {
        const result = await NetFetch.postData('/json/orphantracks/points', request);

        if (result && result.statusCode) {
            switch (result.statusCode) {
                case StatusCodes.OK:
                    return result as OrphanTracksPointsResponse;

                case StatusCodes.UNAUTHORIZED:
                    throw new UnauthorizedError();
            }
        }

        return null;
    }

    /**
     * Drop the pending-track bucket without promoting it. Echo of the
     * deleted row count comes back on success.
     */
    public static async dropBucket(request: OrphanTracksDeleteRequest): Promise<OrphanTracksDeleteResponse|null> {
        const result = await NetFetch.postData('/json/orphantracks/delete', request);

        if (result && result.statusCode) {
            switch (result.statusCode) {
                case StatusCodes.OK:
                    return result as OrphanTracksDeleteResponse;

                case StatusCodes.UNAUTHORIZED:
                    throw new UnauthorizedError();
            }
        }

        return null;
    }

}