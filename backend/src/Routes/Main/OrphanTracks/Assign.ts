import {Logger} from 'figtree';
import {StatusCodes} from 'figtree-schemas';
import {OrphanTracksAssignRequest, OrphanTracksAssignResponse} from 'mwpa_schemas';
import {SightingTourRepository} from '../../../Db/MariaDb/Repositories/SightingTourRepository.js';
import {SightingTourTrackingPendingRepository} from '../../../Db/MariaDb/Repositories/SightingTourTrackingPendingRepository.js';
import {PendingTrackPromoter} from '../../../Service/PendingTrack/PendingTrackPromoter.js';
import {Users} from '../../../Users/Users.js';

/**
 * Assign
 */
export class Assign {

    /**
     * Transfer the pending-track bucket for one (tour_fid, device_id) into
     * the chosen target tour. Refuses when the bucket is empty, the target
     * tour is missing, or the caller (non-admin) doesn't own the target's
     * organisation. Returns the promoted count.
     * @param {number} userId
     * @param {boolean} isAdmin
     * @param {OrphanTracksAssignRequest} body
     * @return {OrphanTracksAssignResponse}
     */
    public static async assign(
        userId: number,
        isAdmin: boolean,
        body?: OrphanTracksAssignRequest
    ): Promise<OrphanTracksAssignResponse> {
        if (!body) {
            return {statusCode: StatusCodes.INTERNAL_ERROR, msg: 'Request body missing'};
        }

        const target = await SightingTourRepository.getInstance().findOne(body.target_tour_id);
        if (!target) {
            return {statusCode: StatusCodes.INTERNAL_ERROR, msg: 'Target tour not found'};
        }

        if (!isAdmin) {
            const orgIds = await Users.getOrganizationIds(userId);
            if (!orgIds.includes(target.organization_id)) {
                return {statusCode: StatusCodes.INTERNAL_ERROR, msg: 'Target tour outside your organisations'};
            }
        }

        const bucketSize = await SightingTourTrackingPendingRepository.getInstance()
            .countByTourFidAndDevice(body.tour_fid, body.device_id);
        if (bucketSize === 0) {
            return {statusCode: StatusCodes.INTERNAL_ERROR, msg: 'Pending bucket is empty'};
        }

        const promoted = await PendingTrackPromoter.promoteForTour(body.tour_fid, body.device_id, target.id);
        Logger.getLogger().info(
            `Main/OrphanTracks::assign: tour_fid=${body.tour_fid} device=${body.device_id} → ` +
            `tour=${target.id} promoted=${promoted} (user=${userId})`
        );

        return {
            statusCode: StatusCodes.OK,
            promoted
        };
    }

}