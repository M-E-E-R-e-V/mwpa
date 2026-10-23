import {StatusCodes} from 'figtree-schemas';
import {ToursTrackingDeleteRequest, ToursTrackingDeleteResponse} from 'mwpa_schemas';
import {Vts} from 'vts';
import {SightingTourRepository} from '../../../Db/MariaDb/Repositories/SightingTourRepository.js';
import {SightingTourTrackingRepository} from '../../../Db/MariaDb/Repositories/SightingTourTrackingRepository.js';
import {Users} from '../../../Users/Users.js';

/**
 * Delete tracking points whose JSON-encoded GPS timestamp falls inside [from, to].
 * Position rows store the timestamp inside a `text` JSON column, so we filter in JS
 * rather than via SQL — the row count per tour is small (a tour has minutes-worth
 * of GPS samples, not millions).
 */
export class Delete {

    public static async deleteTrackingRange(
        userId: number,
        isAdmin: boolean,
        request?: ToursTrackingDeleteRequest
    ): Promise<ToursTrackingDeleteResponse> {
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

        if (!await Users.canAccessOrganization(userId, isAdmin, tour.organization_id)) {
            return {
                statusCode: StatusCodes.FORBIDDEN,
                msg: 'No access to this tour!'
            };
        }

        const tracks = await SightingTourTrackingRepository.getInstance().findByTour(tour.id);
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
                // Skip unparsable rows — they fall outside any time window anyway.
            }
        }

        const affected = await SightingTourTrackingRepository.getInstance().deleteByUnids(unids);

        return {
            statusCode: StatusCodes.OK,
            deleted: affected
        };
    }

}