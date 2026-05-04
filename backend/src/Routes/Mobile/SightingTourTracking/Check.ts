import {Logger} from 'figtree';
import {Vts} from 'vts';
import {SightingTourTrackingCheckRequest, SightingTourTrackingCheckResponse} from 'mwpa_schemas';
import {Const} from '../../../Const.js';
import {DevicesRepository} from '../../../Db/MariaDb/Repositories/DevicesRepository.js';
import {SightingTourRepository} from '../../../Db/MariaDb/Repositories/SightingTourRepository.js';
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

        if (!tour) {
            Logger.getLogger().info(`Mobile/SightingTourTracking::check: Tour not found by tour_fid: ${request.tour_fid}`);
            return {
                statusCode: MobileV1StatusCode.INTERNAL_ERROR
            };
        }

        const tcount = await SightingTourTrackingRepository.getInstance().countByTour(tour.id);

        if (tcount !== request.count) {
            return {
                statusCode: MobileV1StatusCode.OK,
                isComplete: false
            };
        }

        const tourDate = tour.date ? new Date(tour.date.split(' ')[0]) : null;
        if (tourDate && Number.isFinite(tourDate.getTime()) && tourDate < Const.FIX_DELETE_DATE) {
            return {
                statusCode: MobileV1StatusCode.OK,
                isComplete: true,
                canDelete: true
            };
        }

        return {
            statusCode: MobileV1StatusCode.OK,
            isComplete: true
        };
    }

}