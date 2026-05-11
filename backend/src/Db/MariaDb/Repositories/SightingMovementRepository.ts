import {DBRepository} from 'figtree';
import {In} from 'typeorm';
import {SightingMovement} from '../Entities/SightingMovement.js';

/**
 * SightingMovement repository.
 *
 * Logically 1:1 with `sighting`. The service deletes + re-creates rather
 * than merging on rebuild, so the only mutation entry-points the caller
 * needs are `findOneBySighting` and the inherited save/remove.
 */
export class SightingMovementRepository extends DBRepository<SightingMovement> {

    public static REGISTER_NAME = 'sighting_movement';

    public static getInstance(): SightingMovementRepository {
        return super.getSingleInstance(SightingMovement);
    }

    /**
     * Return the movement row for a single sighting, or null when none
     * has been computed yet.
     */
    public async findOneBySighting(sightingId: number): Promise<SightingMovement | null> {
        const repository = await this._repository;
        return repository.findOne({
            where: {sighting_id: sightingId}
        });
    }

    /**
     * Return movements for many sightings in one round-trip. Empty input
     * returns an empty list (no query).
     */
    public async findManyBySightings(sightingIds: number[]): Promise<SightingMovement[]> {
        if (sightingIds.length === 0) {
            return [];
        }

        const repository = await this._repository;
        return repository.find({
            where: {sighting_id: In(sightingIds)}
        });
    }

    /**
     * Drop the movement row for a sighting (if any). Used by the service
     * before writing a fresh one so the table stays 1:1.
     */
    public async deleteBySighting(sightingId: number): Promise<void> {
        const repository = await this._repository;
        await repository.delete({sighting_id: sightingId});
    }

}