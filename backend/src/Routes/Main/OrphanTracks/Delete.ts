import {StatusCodes} from 'figtree-schemas';
import {OrphanTracksDeleteRequest, OrphanTracksDeleteResponse} from 'mwpa_schemas';
import {SightingTourTrackingPendingRepository} from '../../../Db/MariaDb/Repositories/SightingTourTrackingPendingRepository.js';

/**
 * Delete
 *
 * Drop the entire pending-track bucket for (tour_fid, device_id)
 * without promoting it. Used when the admin inspects the orphan on
 * the map and concludes the points are junk (e.g. test rides, GPS
 * noise from a docked vessel, or a tour that genuinely never
 * happened). Returns the row count that was deleted.
 */
export class Delete {

    public static async drop(request?: OrphanTracksDeleteRequest): Promise<OrphanTracksDeleteResponse> {
        const tourFid = (request?.tour_fid ?? '').trim();
        const deviceId = Number(request?.device_id);
        if (tourFid === '' || !Number.isFinite(deviceId) || deviceId <= 0) {
            return {statusCode: StatusCodes.INTERNAL_ERROR, msg: 'tour_fid and device_id are required'};
        }

        const repo = SightingTourTrackingPendingRepository.getInstance();
        const before = await repo.countByTourFidAndDevice(tourFid, deviceId);
        await repo.deleteByTourFidAndDevice(tourFid, deviceId);

        return {statusCode: StatusCodes.OK, deleted: before};
    }

}