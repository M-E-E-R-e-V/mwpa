import {DBRepositoryUnid} from 'figtree';
import {SightingTourTrackingPending} from '../Entities/SightingTourTrackingPending.js';

/**
 * SightingTourTrackingPending repository
 */
export class SightingTourTrackingPendingRepository extends DBRepositoryUnid<SightingTourTrackingPending> {

    /**
     * register name
     */
    public static REGISTER_NAME = 'sighting_tour_tracking_pending';

    /**
     * Return an instance
     * @return {SightingTourTrackingPendingRepository}
     */
    public static getInstance(): SightingTourTrackingPendingRepository {
        return super.getSingleInstance(SightingTourTrackingPending);
    }

    /**
     * Count pending tracks for a (tour_fid, device).
     * @param {string} tourFid
     * @param {number} deviceId
     * @return {number}
     */
    public async countByTourFidAndDevice(tourFid: string, deviceId: number): Promise<number> {
        const repository = await this._repository;
        return repository.count({
            where: {
                tour_fid: tourFid,
                device_id: deviceId
            }
        });
    }

    /**
     * Load all pending tracks for a (tour_fid, device).
     * @param {string} tourFid
     * @param {number} deviceId
     * @return {SightingTourTrackingPending[]}
     */
    public async findByTourFidAndDevice(tourFid: string, deviceId: number): Promise<SightingTourTrackingPending[]> {
        const repository = await this._repository;
        return repository.find({
            where: {
                tour_fid: tourFid,
                device_id: deviceId
            }
        });
    }

    /**
     * Delete all pending tracks for a (tour_fid, device). Called after
     * the rows have been promoted into `sighting_tour_tracking`.
     * @param {string} tourFid
     * @param {number} deviceId
     */
    public async deleteByTourFidAndDevice(tourFid: string, deviceId: number): Promise<void> {
        const repository = await this._repository;
        await repository.delete({
            tour_fid: tourFid,
            device_id: deviceId
        });
    }

}