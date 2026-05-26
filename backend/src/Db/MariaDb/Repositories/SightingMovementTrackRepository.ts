import {DBRepository} from 'figtree';
import {In} from 'typeorm';
import {SightingMovementTrack} from '../Entities/SightingMovementTrack.js';

/**
 * SightingMovementTrack repository — segments belonging to a
 * {@link SightingMovementRepository} row. Rebuilt as a unit per
 * movement (delete-by-movement + insert).
 */
export class SightingMovementTrackRepository extends DBRepository<SightingMovementTrack> {

    public static REGISTER_NAME = 'sighting_movement_track';

    public static getInstance(): SightingMovementTrackRepository {
        return super.getSingleInstance(SightingMovementTrack);
    }

    /**
     * All segments of a movement, ordered by sequence_no ascending.
     */
    public async findByMovement(movementId: number): Promise<SightingMovementTrack[]> {
        const repository = await this._repository;
        return repository.find({
            where: {sighting_movement_id: movementId},
            order: {sequence_no: 'ASC'}
        });
    }

    /**
     * Drop all segments of a movement. Used before writing a fresh set
     * on rebuild.
     */
    public async deleteByMovement(movementId: number): Promise<void> {
        const repository = await this._repository;
        await repository.delete({sighting_movement_id: movementId});
    }

    /**
     * Batch sibling of {@link findByMovement} — segments for many
     * movements in one round-trip, ordered by movement then sequence
     * so the caller can stable-group by `sighting_movement_id`.
     */
    public async findByMovements(movementIds: number[]): Promise<SightingMovementTrack[]> {
        if (movementIds.length === 0) {
            return [];
        }
        const repository = await this._repository;
        return repository.find({
            where: {sighting_movement_id: In(movementIds)},
            order: {sighting_movement_id: 'ASC', sequence_no: 'ASC'}
        });
    }

    /**
     * Drop all segments belonging to any of the given movements. Helpful
     * when bulk-rebuilding a tour.
     */
    public async deleteByMovements(movementIds: number[]): Promise<void> {
        if (movementIds.length === 0) {
            return;
        }
        const repository = await this._repository;
        await repository.delete({sighting_movement_id: In(movementIds)});
    }

}