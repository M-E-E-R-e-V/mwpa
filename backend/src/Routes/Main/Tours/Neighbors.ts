import {StatusCodes} from 'figtree-schemas';
import {
    ToursTrackingNeighborTour,
    ToursTrackingNeighborsRequest,
    ToursTrackingNeighborsResponse
} from 'mwpa_schemas';
import {Vts} from 'vts';
import {SightingTour} from '../../../Db/MariaDb/Entities/SightingTour.js';
import {SightingTourRepository} from '../../../Db/MariaDb/Repositories/SightingTourRepository.js';
import {SightingTourTrackingRepository} from '../../../Db/MariaDb/Repositories/SightingTourTrackingRepository.js';

/**
 * Resolve previous/next tour for the same vehicle — used by the
 * tracking-edit UI to populate the "transfer to" picker without
 * forcing the user to look the IDs up by hand.
 */
export class Neighbors {

    public static async getNeighbors(request?: ToursTrackingNeighborsRequest): Promise<ToursTrackingNeighborsResponse> {
        if (Vts.isUndefined(request)) {
            return {
                statusCode: StatusCodes.INTERNAL_ERROR,
                msg: 'Request incomplete'
            };
        }

        const tour = await SightingTourRepository.getInstance().findOne(request.tour_id);
        if (!tour) {
            return {
                statusCode: StatusCodes.INTERNAL_ERROR,
                msg: 'Tour not found by ID!'
            };
        }

        const prevTour = await SightingTourRepository.getInstance().findPrevByVehicle(tour.vehicle_id, tour.date);
        const nextTour = await SightingTourRepository.getInstance().findNextByVehicle(tour.vehicle_id, tour.date);

        return {
            statusCode: StatusCodes.OK,
            prev: prevTour ? await Neighbors._toEntry(prevTour) : undefined,
            next: nextTour ? await Neighbors._toEntry(nextTour) : undefined
        };
    }

    private static async _toEntry(tour: SightingTour): Promise<ToursTrackingNeighborTour> {
        const count = await SightingTourTrackingRepository.getInstance().countByTour(tour.id);
        return {
            id: tour.id,
            date: tour.date,
            tour_start: tour.tour_start,
            tour_end: tour.tour_end,
            vehicle_id: tour.vehicle_id,
            count_trackings: count
        };
    }

}