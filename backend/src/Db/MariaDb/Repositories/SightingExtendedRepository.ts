import {DBRepositoryUnid} from 'figtree';
import {SightingExtended} from '../Entities/SightingExtended.js';

/**
 * SightingExtended repository
 */
export class SightingExtendedRepository extends DBRepositoryUnid<SightingExtended> {

    /**
     * register name
     */
    public static REGISTER_NAME = 'sighting_extended';

    /**
     * Retrun a instance
     * @return {SightingExtendedRepository}
     */
    public static getInstance(): SightingExtendedRepository {
        return super.getSingleInstance(SightingExtended);
    }

    /**
     * Find all extended fields for a sighting.
     * @param {number} sightingId
     * @return {SightingExtended[]}
     */
    public async findBySighting(sightingId: number): Promise<SightingExtended[]> {
        const repository = await this._repository;
        return repository.find({
            where: {
                sighting_id: sightingId
            }
        });
    }

}