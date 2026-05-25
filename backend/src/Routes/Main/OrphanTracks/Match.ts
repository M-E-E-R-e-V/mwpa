import {StatusCodes} from 'figtree-schemas';
import {OrphanTracksMatchCandidate, OrphanTracksMatchRequest, OrphanTracksMatchResponse} from 'mwpa_schemas';
import {SightingRepository} from '../../../Db/MariaDb/Repositories/SightingRepository.js';
import {SightingTourRepository} from '../../../Db/MariaDb/Repositories/SightingTourRepository.js';
import {SightingTourTrackingRepository} from '../../../Db/MariaDb/Repositories/SightingTourTrackingRepository.js';
import {Users} from '../../../Users/Users.js';

/**
 * Match
 */
export class Match {

    /**
     * Find candidate `SightingTour` rows for the OrphanTracks-Assign dialog.
     * Pickers are AND-combined; empty pickers act as wildcards. When the
     * caller supplies tour_start, results are time-distance sorted.
     * @param {number} userId
     * @param {boolean} isAdmin
     * @param {OrphanTracksMatchRequest} body
     * @return {OrphanTracksMatchResponse}
     */
    public static async getMatches(
        userId: number,
        isAdmin: boolean,
        body?: OrphanTracksMatchRequest
    ): Promise<OrphanTracksMatchResponse> {
        const orgIds = isAdmin ? undefined : await Users.getOrganizationIds(userId);

        const tours = await SightingTourRepository.getInstance().findCandidatesForOrphan(
            {
                vehicle_id: body?.vehicle_id,
                vehicle_driver_id: body?.vehicle_driver_id,
                date: body?.date,
                tour_start: body?.tour_start
            },
            orgIds
        );

        const tourFids = tours.map((t) => t.tour_fid);
        const tourIds = tours.map((t) => t.id);
        const [sightingCounts, trackingCounts] = await Promise.all([
            SightingRepository.getInstance().countGroupedByTourFid(tourFids),
            SightingTourTrackingRepository.getInstance().countGroupedByTour(tourIds)
        ]);

        const list: OrphanTracksMatchCandidate[] = tours.map((t) => ({
            id: t.id,
            tour_fid: t.tour_fid,
            vehicle_id: t.vehicle_id,
            vehicle_driver_id: t.vehicle_driver_id,
            date: t.date,
            tour_start: t.tour_start,
            tour_end: t.tour_end,
            count_sightings: sightingCounts.get(t.tour_fid) ?? 0,
            count_trackings: trackingCounts.get(t.id) ?? 0
        }));

        return {
            statusCode: StatusCodes.OK,
            list
        };
    }

}