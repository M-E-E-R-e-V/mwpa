import {DBRepositoryUnid} from 'figtree';
import {In} from 'typeorm';
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

    /**
     * Bulk-count tracking points grouped by sighting_tour_id for a set
     * of tour ids. Returns a map keyed by sighting_tour_id; tours with
     * no tracking points are absent from the map (caller treats as 0).
     *
     * Single GROUP BY query replaces N per-tour `countByTour` calls in
     * the Tours list endpoint.
     * @param {number[]} sightingTourIds
     * @return {Map<number, number>}
     */
    public async countGroupedByTour(sightingTourIds: number[]): Promise<Map<number, number>> {
        const result = new Map<number, number>();
        if (sightingTourIds.length === 0) {
            return result;
        }
        const repository = await this._repository;
        const rows = await repository.createQueryBuilder('t')
            .select('t.sighting_tour_id', 'tour_id')
            .addSelect('COUNT(*)', 'cnt')
            .where({sighting_tour_id: In(sightingTourIds)})
            .groupBy('t.sighting_tour_id')
            .getRawMany<{tour_id: number; cnt: string}>();
        for (const row of rows) {
            result.set(Number(row.tour_id), Number(row.cnt));
        }
        return result;
    }

}