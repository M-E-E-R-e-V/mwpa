import {
    SightingFishingVesselEntry,
    SightingFishingVesselListRequest,
    SightingFishingVesselListResponse
} from 'mwpa_schemas';
import {NetFetch} from '../Net/NetFetch';
import {UnauthorizedError} from './Error/UnauthorizedError';
import {StatusCodes} from './Status/StatusCodes';

export type {
    SightingFishingVesselEntry,
    SightingFishingVesselListRequest,
    SightingFishingVesselListResponse
};

/**
 * Per-sighting GFW fishing-vessel breakdown. Backend lazily writes
 * the table from the FishingEffortService cron, so sightings that
 * haven't been processed yet are silently absent from the response.
 */
export class SightingFishingVessel {

    /**
     * Bulk-fetch vessels for a set of sighting ids. Empty input
     * returns an empty list without an HTTP call.
     */
    public static async getList(sightingIds: number[]): Promise<SightingFishingVesselEntry[]> {
        if (sightingIds.length === 0) {
            return [];
        }

        const req: SightingFishingVesselListRequest = {sighting_ids: sightingIds};
        const result = await NetFetch.postData('/json/sightings/fishing-vessels/list', req);

        if (result && result.statusCode) {
            switch (result.statusCode) {
                case StatusCodes.OK:
                    return ((result as SightingFishingVesselListResponse).list) ?? [];

                case StatusCodes.UNAUTHORIZED:
                    throw new UnauthorizedError();
            }
        }

        return [];
    }

}