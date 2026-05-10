import {DBRepository} from 'figtree';
import {Between, FindOptionsOrder, FindOptionsWhere, In, Like, Raw} from 'typeorm';
import {Sighting} from '../Entities/Sighting.js';

/**
 * Optional filter criteria for {@link SightingRepository.findActiveList}.
 * All fields are AND-combined; undefined fields are ignored.
 */
export type SightingFilterCriteria = {
    period_from?: string;
    period_to?: string;
    species_id?: number;
    organization_id?: number;
    vehicle_id?: number;
    vehicle_driver_id?: number;
    search?: string;
};

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
     * Distinct calendar years that appear in non-deleted sightings, ordered DESC.
     * Skips rows where the date column is empty or not parseable as YYYY-…
     * Used by the Excel-Report year picker.
     * @return {number[]}
     */
    public async findDistinctYears(): Promise<number[]> {
        const repository = await this._repository;
        const rows = await repository
            .createQueryBuilder('s')
            .select('DISTINCT YEAR(s.date)', 'year')
            .where('s.deleted = :deleted', {deleted: false})
            .andWhere('s.date <> :empty', {empty: ''})
            .andWhere('YEAR(s.date) IS NOT NULL')
            .orderBy('year', 'DESC')
            .getRawMany<{year: number | string | null}>();

        const years: number[] = [];

        for (const row of rows) {
            if (row.year === null || row.year === undefined) {
                continue;
            }

            const y = typeof row.year === 'number' ? row.year : Number(row.year);

            if (Number.isFinite(y) && y > 0) {
                years.push(y);
            }
        }

        return years;
    }

    /**
     * Paginated list of non-deleted sightings, optionally restricted to a set of organization ids
     * and further narrowed by the user-provided filter criteria.
     *
     * Org scoping precedence: when both `organizationIds` (the caller's allow-list, set for
     * non-admins) and `filter.organization_id` (an explicit pick) are present, the explicit
     * pick must be inside the allow-list — otherwise the result is empty (no leak across orgs).
     *
     * @param {FindOptionsOrder<Sighting>} order
     * @param {number | undefined} skip
     * @param {number | undefined} take
     * @param {number[] | undefined} organizationIds — when set, restricts results to these orgs
     * @param {SightingFilterCriteria | undefined} filter — extra AND-combined criteria
     * @return {{rows: Sighting[]; count: number}}
     */
    public async findActiveList(
        order: FindOptionsOrder<Sighting>,
        skip?: number,
        take?: number,
        organizationIds?: number[],
        filter?: SightingFilterCriteria
    ): Promise<{rows: Sighting[]; count: number}> {
        const repository = await this._repository;
        const baseWhere: FindOptionsWhere<Sighting> = {
            deleted: false
        };

        if (organizationIds !== undefined) {
            if (organizationIds.length === 0) {
                return {rows: [], count: 0};
            }

            if (filter?.organization_id !== undefined) {
                if (!organizationIds.includes(filter.organization_id)) {
                    return {rows: [], count: 0};
                }

                baseWhere.organization_id = filter.organization_id;
            } else {
                baseWhere.organization_id = In(organizationIds);
            }
        } else if (filter?.organization_id !== undefined) {
            baseWhere.organization_id = filter.organization_id;
        }

        if (filter?.species_id !== undefined) {
            baseWhere.species_id = filter.species_id;
        }

        if (filter?.vehicle_id !== undefined) {
            baseWhere.vehicle_id = filter.vehicle_id;
        }

        if (filter?.vehicle_driver_id !== undefined) {
            baseWhere.vehicle_driver_id = filter.vehicle_driver_id;
        }

        const periodFrom = (filter?.period_from ?? '').trim();
        const periodTo = (filter?.period_to ?? '').trim();

        if (periodFrom !== '' && periodTo !== '') {
            baseWhere.date = Between(periodFrom, periodTo);
        } else if (periodFrom !== '') {
            baseWhere.date = Raw((alias) => `${alias} >= :from`, {from: periodFrom});
        } else if (periodTo !== '') {
            baseWhere.date = Raw((alias) => `${alias} <= :to`, {to: periodTo});
        }

        const search = (filter?.search ?? '').trim();

        // The free-text search is OR-ed across two text columns, so the combined
        // where becomes an array (TypeORM treats array-of-where as OR over rows
        // matching any branch). Each branch must repeat the AND criteria.
        let where: FindOptionsWhere<Sighting> | FindOptionsWhere<Sighting>[] = baseWhere;

        if (search !== '') {
            const like = Like(`%${search}%`);
            where = [
                {...baseWhere, note: like},
                {...baseWhere, recognizable_animals: like}
            ];
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