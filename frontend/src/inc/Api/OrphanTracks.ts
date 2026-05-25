import {
    OrphanTrackEntry,
    OrphanTracksAssignRequest,
    OrphanTracksAssignResponse,
    OrphanTracksFilter,
    OrphanTracksListResponse,
    OrphanTracksMatchCandidate,
    OrphanTracksMatchRequest,
    OrphanTracksMatchResponse
} from 'mwpa_schemas';
import {NetFetch} from '../Net/NetFetch';
import {UnauthorizedError} from './Error/UnauthorizedError';
import {StatusCodes} from './Status/StatusCodes';

export type {
    OrphanTrackEntry,
    OrphanTracksAssignRequest,
    OrphanTracksAssignResponse,
    OrphanTracksFilter,
    OrphanTracksListResponse,
    OrphanTracksMatchCandidate,
    OrphanTracksMatchRequest,
    OrphanTracksMatchResponse
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

}