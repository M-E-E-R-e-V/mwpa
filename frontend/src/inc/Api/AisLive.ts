import {
    AisLiveListRequest,
    AisLiveListResponse,
    AisLiveVesselEntry,
    AisVesselTrackPoint,
    AisVesselTrackRequest,
    AisVesselTrackResponse
} from 'mwpa_schemas';
import {NetFetch} from '../Net/NetFetch';
import {UnauthorizedError} from './Error/UnauthorizedError';
import {StatusCodes} from './Status/StatusCodes';

export type {
    AisLiveListRequest,
    AisLiveListResponse,
    AisLiveVesselEntry,
    AisVesselTrackPoint,
    AisVesselTrackRequest,
    AisVesselTrackResponse
};

/**
 * Live AIS — current vessels in the buffer (joined with static
 * vessel metadata). The live-map page polls this every ~30 s.
 */
export class AisLive {

    public static async getList(req?: AisLiveListRequest): Promise<AisLiveVesselEntry[]> {
        const result = await NetFetch.postData('/json/ais/live/list', req ?? {});

        if (result && result.statusCode) {
            switch (result.statusCode) {
                case StatusCodes.OK:
                    return ((result as AisLiveListResponse).list) ?? [];

                case StatusCodes.UNAUTHORIZED:
                    throw new UnauthorizedError();
            }
        }

        return [];
    }

    /**
     * Chronological track for one MMSI from the live buffer. Defaults
     * to the last hour. Returns oldest → newest so the caller can feed
     * the coords straight into a polyline.
     */
    public static async getTrack(mmsi: string, sinceSeconds?: number): Promise<AisVesselTrackPoint[]> {
        const req: AisVesselTrackRequest = {mmsi};
        if (typeof sinceSeconds === 'number') {
            req.since_seconds = sinceSeconds;
        }

        const result = await NetFetch.postData('/json/ais/vessel/track', req);

        if (result && result.statusCode) {
            switch (result.statusCode) {
                case StatusCodes.OK:
                    return ((result as AisVesselTrackResponse).points) ?? [];

                case StatusCodes.UNAUTHORIZED:
                    throw new UnauthorizedError();
            }
        }

        return [];
    }

}