import {
    TourEntry,
    ToursCreater,
    ToursDevice,
    ToursFilter,
    ToursListResponse,
    ToursTrackingData,
    ToursTrackingResponse,
    ToursTrackingSightingData,
    ToursTrackingSightingExtended
} from 'mwpa_schemas';
import {NetFetch} from '../Net/NetFetch';
import {UnauthorizedError} from './Error/UnauthorizedError';
import {StatusCodes} from './Status/StatusCodes';

/*
 * The wire shapes live in the `mwpa_schemas` workspace package — the same
 * `Vts.object(...)` definitions the backend validates request/response
 * against. Re-exporting here means consumers keep importing from this
 * file without coupling to the schemas package path, while drift between
 * the hand-written types and the actual schema (the way the order-block
 * got out of sync in 5869278…d3) is no longer possible.
 */
export type {
    TourEntry,
    ToursCreater,
    ToursDevice,
    ToursFilter,
    ToursListResponse,
    ToursTrackingData,
    ToursTrackingResponse,
    ToursTrackingSightingData,
    ToursTrackingSightingExtended
};

/**
 * Tour
 */
export class Tours {

    /**
     * getList
     */
    public static async getList(filter?: ToursFilter): Promise<ToursListResponse|null> {
        const result = await NetFetch.postData('/json/tours/list', filter ?? {});

        if (result && result.statusCode) {
            switch (result.statusCode) {
                case StatusCodes.OK:
                    return result as ToursListResponse;

                case StatusCodes.UNAUTHORIZED:
                    throw new UnauthorizedError();
            }
        }

        return null;
    }

    /**
     * getTrackingList
     * @param tourId
     */
    public static async getTrackingList(tourId: number): Promise<ToursTrackingData|null> {
        const result = await NetFetch.postData('/json/tours/tracking/list', {
            tour_id: tourId
        });

        if (result && result.statusCode) {
            switch (result.statusCode) {
                case StatusCodes.OK:
                    return result.tracking as ToursTrackingData;

                case StatusCodes.UNAUTHORIZED:
                    throw new UnauthorizedError();
            }
        }

        return null;
    }

}