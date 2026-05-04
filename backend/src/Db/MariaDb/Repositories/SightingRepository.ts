import {DBRepository} from 'figtree';
import {FindOptionsOrder, In} from 'typeorm';
import {Sighting} from '../Entities/Sighting.js';

/**
 * Sighting repository
 */
export class SightingRepository extends DBRepository<Sighting> {

    /**
     * register name
     */
    public static REGISTER_NAME = 'sighting';

    /**
     * Retrun a instance
     * @return {SightingRepository}
     */
    public static getInstance(): SightingRepository {
        return super.getSingleInstance(Sighting);
    }

    /**
     * Count sightings linked to a species id.
     * @param {number} speciesId
     * @return {number}
     */
    public async countBySpecies(speciesId: number): Promise<number> {
        const repository = await this._repository;
        return repository.count({
            where: {
                species_id: speciesId
            }
        });
    }

    /**
     * Count sightings on a tour (by foreign tour_fid).
     * @param {string} tourFid
     * @return {number}
     */
    public async countByTourFid(tourFid: string): Promise<number> {
        const repository = await this._repository;
        return repository.count({
            where: {
                tour_fid: tourFid
            }
        });
    }

    /**
     * Find all sightings on a tour (by foreign tour_fid).
     * @param {string} tourFid
     * @return {Sighting[]}
     */
    public async findByTourFid(tourFid: string): Promise<Sighting[]> {
        const repository = await this._repository;
        return repository.find({
            where: {
                tour_fid: tourFid
            }
        });
    }

    /**
     * Find a sighting by its mobile-side unid.
     * @param {string} unid
     * @return {Sighting | null}
     */
    public async findByUnid(unid: string): Promise<Sighting | null> {
        const repository = await this._repository;
        return repository.findOne({
            where: {unid}
        });
    }

    /**
     * Find a sighting by its content hash (used for de-dupe on mobile sync).
     * @param {string} hash
     * @return {Sighting | null}
     */
    public async findByHash(hash: string): Promise<Sighting | null> {
        const repository = await this._repository;
        return repository.findOne({
            where: {hash}
        });
    }

    /**
     * Reassign all sightings from sourceSpeciesId to destinationSpeciesId.
     * @param {number} sourceSpeciesId
     * @param {number} destinationSpeciesId
     * @return {number} affected row count
     */
    public async reassignSpecies(sourceSpeciesId: number, destinationSpeciesId: number): Promise<number> {
        const repository = await this._repository;
        const result = await repository
            .createQueryBuilder()
            .update()
            .set({
                species_id: destinationSpeciesId
            })
            .where('species_id = :species_id', {species_id: sourceSpeciesId})
            .execute();

        return result.affected ?? 0;
    }

    /**
     * Paginated list of non-deleted sightings, optionally restricted to a set of organization ids.
     * @param {FindOptionsOrder<Sighting>} order
     * @param {number | undefined} skip
     * @param {number | undefined} take
     * @param {number[] | undefined} organizationIds — when set, restricts results to these orgs
     * @return {{rows: Sighting[]; count: number}}
     */
    public async findActiveList(
        order: FindOptionsOrder<Sighting>,
        skip?: number,
        take?: number,
        organizationIds?: number[]
    ): Promise<{rows: Sighting[]; count: number}> {
        const repository = await this._repository;
        const where: Record<string, unknown> = {
            deleted: false
        };

        if (organizationIds !== undefined) {
            if (organizationIds.length === 0) {
                return {rows: [], count: 0};
            }
            where.organization_id = In(organizationIds);
        }

        const [rows, count] = await repository.findAndCount({
            where,
            order,
            skip,
            take
        });

        return {rows, count};
    }

}