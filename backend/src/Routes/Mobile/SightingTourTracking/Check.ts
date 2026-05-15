import {Logger} from 'figtree';
import {Vts} from 'vts';
import {SightingTourTrackingCheckRequest, SightingTourTrackingCheckResponse} from 'mwpa_schemas';
import {Const} from '../../../Const.js';
import {DevicesRepository} from '../../../Db/MariaDb/Repositories/DevicesRepository.js';
import {SightingTourRepository} from '../../../Db/MariaDb/Repositories/SightingTourRepository.js';
import {SightingTourTrackingPendingRepository} from '../../../Db/MariaDb/Repositories/SightingTourTrackingPendingRepository.js';
import {SightingTourTrackingRepository} from '../../../Db/MariaDb/Repositories/SightingTourTrackingRepository.js';
import {MobileV1StatusCode} from '../MobileV1.js';

/**
 * Check
 */
export class Check {

    /**
     * Compare the device's track count with the server's count for a tour, and signal whether
     * the server has all tracks (isComplete) and whether the device may delete its local
     * copy because the tour is older than FIX_DELETE_DATE (canDelete).
     *
     * If no `SightingTour` exists yet for the tour_fid (the parent sighting hasn't been
     * synced — or never will be), the server still accepts tracks into the pending bucket
     * (`SightingTourTrackingPending`). Counts from that bucket are added to the total so
     * the device doesn't re-upload tracks already buffered server-side.
     *
     * @param {string} deviceIdentity
     * @param {SightingTourTrackingCheckRequest} request
     * @return {SightingTourTrackingCheckResponse}
     */
    public static async check(
        deviceIdentity: string,
        request?: SightingTourTrackingCheckRequest
    ): Promise<SightingTourTrackingCheckResponse> {
        if (Vts.isUndefined(request)) {
            return {
                statusCode: MobileV1StatusCode.INTERNAL_ERROR,
                msg: 'Request incomplete'
            };
        }

        const device = await DevicesRepository.getInstance().findByIdentity(deviceIdentity);

        if (!device) {
            return {
                statusCode: MobileV1StatusCode.INTERNAL_ERROR,
                msg: 'Device not found!'
            };
        }

        const tour = await SightingTourRepository.getInstance().findByTourFidAndDevice(request.tour_fid, device.id);

        const tourCount = tour
            ? await SightingTourTrackingRepository.getInstance().countByTour(tour.id)
            : 0;

        const pendingCount = await SightingTourTrackingPendingRepository
            .getInstance()
            .countByTourFidAndDevice(request.tour_fid, device.id);

        const serverTotal = tourCount + pendingCount;

        if (serverTotal !== request.count) {
            if (!tour) {
                Logger.getLogger().info(
                    `Mobile/SightingTourTracking::check: no tour yet for tour_fid: ${request.tour_fid}, ` +
                    `pending=${pendingCount}, requestCount=${request.count} — request upload`
                );
            }
            return {
                statusCode: MobileV1StatusCode.OK,
                isComplete: false
            };
        }

        // Counts match. We only signal canDelete when the tour exists and is overtime —
        // pending-only tour_fids must never tell the device to drop its local copy,
        // because a sighting may still arrive and promote the bucket.
        if (tour) {
            const tourDate = tour.date ? new Date(tour.date.split(' ')[0]) : null;
            if (tourDate && Number.isFinite(tourDate.getTime()) && tourDate < Const.FIX_DELETE_DATE) {
                return {
                    statusCode: MobileV1StatusCode.OK,
                    isComplete: true,
                    canDelete: true
                };
            }
        }

        return {
            statusCode: MobileV1StatusCode.OK,
            isComplete: true
        };
    }

}