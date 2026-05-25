import {StatusCodes} from 'figtree-schemas';
import {ToursTrackingTransferRequest, ToursTrackingTransferResponse} from 'mwpa_schemas';
import {Vts} from 'vts';
import {SightingTourRepository} from '../../../Db/MariaDb/Repositories/SightingTourRepository.js';
import {SightingTourTrackingRepository} from '../../../Db/MariaDb/Repositories/SightingTourTrackingRepository.js';

/**
 * Move tracking rows whose GPS timestamp falls in [from, to] from the source
 * tour to a target tour. Both tours must exist; same JSON-in-text filter as Delete.
 */
export class Transfer {

    public static async transferTrackingRange(request?: ToursTrackingTransferRequest): Promise<ToursTrackingTransferResponse> {
        if (Vts.isUndefined(request)) {
            return {
                statusCode: StatusCodes.INTERNAL_ERROR,
                msg: 'Request incomplete'
            };
        }

        if (request.tour_id_from === request.tour_id_to) {
            return {
                statusCode: StatusCodes.INTERNAL_ERROR,
                msg: 'Source and target tour must differ'
            };
        }

        const tourRepo = SightingTourRepository.getInstance();

        const tourFrom = await tourRepo.findOne(request.tour_id_from);
        if (!tourFrom) {
            return {
                statusCode: StatusCodes.INTERNAL_ERROR,
                msg: 'Source tour not found by ID!'
            };
        }

        const tourTo = await tourRepo.findOne(request.tour_id_to);
        if (!tourTo) {
            return {
                statusCode: StatusCodes.INTERNAL_ERROR,
                msg: 'Target tour not found by ID!'
            };
        }

        const tracks = await SightingTourTrackingRepository.getInstance().findByTour(tourFrom.id);
        const unids: string[] = [];

        for (const track of tracks) {
            try {
                const pos = JSON.parse(track.position) as {timestamp?: number;};
                if (typeof pos.timestamp === 'number' &&
                    pos.timestamp >= request.timestamp_from &&
                    pos.timestamp <= request.timestamp_to) {
                    unids.push(track.unid);
                }
            } catch {
                // skip
            }
        }

        const affected = await SightingTourTrackingRepository.getInstance().reassignTour(unids, tourTo.id);

        return {
            statusCode: StatusCodes.OK,
            transferred: affected
        };
    }

}