import {DBRepository} from 'figtree';
import {SightingTour} from '../Entities/SightingTour.js';

/**
 * SightingTour repository
 */
export class SightingTourRepository extends DBRepository<SightingTour> {

    /**
     * register name
     */
    public static REGISTER_NAME = 'sighting_tour';

    /**
     * Retrun a instance
     * @return {SightingTourRepository}
     */
    public static getInstance(): SightingTourRepository {
        return super.getSingleInstance(SightingTour);
    }

    /**
     * Find tours ordered by date desc, with optional skip/take.
     * @param {number | undefined} skip
     * @param {number | undefined} take
     * @return {SightingTour[]}
     */
    public async findOrdered(skip?: number, take?: number): Promise<SightingTour[]> {
        const repository = await this._repository;
        return repository.find({
            order: {
                date: 'DESC',
                tour_start: 'DESC'
            },
            skip,
            take
        });
    }

    /**
     * Find one by tour_fid + device_id (mobile sync key).
     * @param {string} tourFid
     * @param {number} deviceId
     * @return {SightingTour | null}
     */
    public async findByTourFidAndDevice(tourFid: string, deviceId: number): Promise<SightingTour | null> {
        const repository = await this._repository;
        return repository.findOne({
            where: {
                tour_fid: tourFid,
                device_id: deviceId
            }
        });
    }

}