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

    /**
     * Return distinct (tour_fid, device_id) pairs whose *oldest* pending row is
     * older than the given cutoff (seconds since epoch). Used by the promotion
     * cron to find tour_fids that have been waiting long enough for their
     * sighting and should now be promoted into a synthetic tour.
     *
     * @param {number} cutoffSec
     * @return {{tour_fid: string; device_id: number;}[]}
     */
    public async findDistinctOlderThan(cutoffSec: number): Promise<{tour_fid: string; device_id: number;}[]> {
        const repository = await this._repository;
        const rows: {tour_fid: string; device_id: number;}[] = await repository
            .createQueryBuilder('p')
            .select('p.tour_fid', 'tour_fid')
            .addSelect('p.device_id', 'device_id')
            .groupBy('p.tour_fid')
            .addGroupBy('p.device_id')
            .having('MIN(p.pending_since) < :cutoff', {cutoff: cutoffSec})
            .getRawMany();

        return rows.map((r) => ({tour_fid: r.tour_fid, device_id: Number(r.device_id)}));
    }

}