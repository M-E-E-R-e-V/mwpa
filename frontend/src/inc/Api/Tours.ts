import {
    TourEntry,
    ToursCreater,
    ToursDevice,
    ToursFilter,
    ToursListResponse,
    ToursTrackingData,
    ToursTrackingDeleteResponse,
    ToursTrackingNeighborTour,
    ToursTrackingNeighborsResponse,
    ToursTrackingResponse,
    ToursTrackingSightingData,
    ToursTrackingSightingExtended,
    ToursTrackingTransferResponse
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
    ToursTrackingDeleteResponse,
    ToursTrackingNeighborTour,
    ToursTrackingNeighborsResponse,
    ToursTrackingResponse,
    ToursTrackingSightingData,
    ToursTrackingSightingExtended,
    ToursTrackingTransferResponse
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

    /**
     * Resolve previous/next tour (same vehicle) for the tracking-edit picker.
     * @param tourId
     */
    public static async getTrackingNeighbors(tourId: number): Promise<{
        prev?: ToursTrackingNeighborTour;
        next?: ToursTrackingNeighborTour;
    } | null> {
        const result = await NetFetch.postData('/json/tours/tracking/neighbors', {
            tour_id: tourId
        }) as ToursTrackingNeighborsResponse;

        if (result && result.statusCode) {
            switch (result.statusCode) {
                case StatusCodes.OK:
                    return {prev: result.prev, next: result.next};

                case StatusCodes.UNAUTHORIZED:
                    throw new UnauthorizedError();
            }
        }

        return null;
    }

    /**
     * Delete tracking points whose GPS timestamp falls inside [timestampFrom, timestampTo].
     * @param tourId
     * @param timestampFrom inclusive ms epoch
     * @param timestampTo   inclusive ms epoch
     */
    public static async deleteTracking(
        tourId: number,
        timestampFrom: number,
        timestampTo: number
    ): Promise<number> {
        const result = await NetFetch.postData('/json/tours/tracking/delete', {
            tour_id: tourId,
            timestamp_from: timestampFrom,
            timestamp_to: timestampTo
        }) as ToursTrackingDeleteResponse;

        if (result && result.statusCode === StatusCodes.UNAUTHORIZED) {
            throw new UnauthorizedError();
        }

        if (result && result.statusCode === StatusCodes.OK) {
            return result.deleted ?? 0;
        }

        throw new Error(result?.msg ?? 'Delete failed');
    }

    /**
     * Transfer tracking points whose timestamp falls in [timestampFrom, timestampTo]
     * from source tour to target tour.
     */
    public static async transferTracking(
        tourIdFrom: number,
        tourIdTo: number,
        timestampFrom: number,
        timestampTo: number
    ): Promise<number> {
        const result = await NetFetch.postData('/json/tours/tracking/transfer', {
            tour_id_from: tourIdFrom,
            tour_id_to: tourIdTo,
            timestamp_from: timestampFrom,
            timestamp_to: timestampTo
        }) as ToursTrackingTransferResponse;

        if (result && result.statusCode === StatusCodes.UNAUTHORIZED) {
            throw new UnauthorizedError();
        }

        if (result && result.statusCode === StatusCodes.OK) {
            return result.transferred ?? 0;
        }

        throw new Error(result?.msg ?? 'Transfer failed');
    }

}