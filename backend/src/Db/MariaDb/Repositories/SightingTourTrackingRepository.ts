import {DBRepositoryUnid} from 'figtree';
import {SightingTourTracking} from '../Entities/SightingTourTracking.js';

/**
 * SightingTourTracking repository
 */
export class SightingTourTrackingRepository extends DBRepositoryUnid<SightingTourTracking> {

    /**
     * register name
     */
    public static REGISTER_NAME = 'sighting_tour_tracking';

    /**
     * Retrun a instance
     * @return {SightingTourTrackingRepository}
     */
    public static getInstance(): SightingTourTrackingRepository {
        return super.getSingleInstance(SightingTourTracking);
    }

    /**
     * Count tracking points for a tour.
     * @param {number} sightingTourId
     * @return {number}
     */
    public async countByTour(sightingTourId: number): Promise<number> {
        const repository = await this._repository;
        return repository.count({
            where: {
                sighting_tour_id: sightingTourId
            }
        });
    }

    /**
     * Find all tracking points for a tour.
     * @param {number} sightingTourId
     * @return {SightingTourTracking[]}
     */
    public async findByTour(sightingTourId: number): Promise<SightingTourTracking[]> {
        const repository = await this._repository;
        return repository.find({
            where: {
                sighting_tour_id: sightingTourId
            }
        });
    }

}