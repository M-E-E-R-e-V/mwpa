import {DBRepository} from '@stefanwerfling/figtree';
import {Between, FindOptionsOrder, FindOptionsWhere, In, Raw} from 'typeorm';
import {SightingOld} from '../Entities/SightingOld.js';

/**
 * Filter criteria shared with the main sightings list (the subset that makes
 * sense for the hand-maintained old table — it has no vehicle/driver ids).
 */
export type SightingOldFilterCriteria = {
    period_from?: string;
    period_to?: string;
    species_id?: number;
};

/**
 * SightingOld repository — read access to the imported historical sightings.
 * Writes happen once via the standalone import script (raw bulk insert), not
 * through here.
 */
export class SightingOldRepository extends DBRepository<SightingOld> {

    /**
     * register name
     */
    public static REGISTER_NAME = 'sighting_old';

    /**
     * Return an instance
     */
    public static getInstance(): SightingOldRepository {
        return super.getSingleInstance(SightingOld);
    }

    /**
     * Count of non-deleted old sightings matching the filter. Lets the list
     * route know how many old rows exist without loading them.
     */
    public async countActive(filter?: SightingOldFilterCriteria): Promise<number> {
        const repository = await this._repository;

        return repository.countBy(SightingOldRepository._buildWhere(filter));
    }

    /**
     * Page of non-deleted old sightings matching the filter, ordered.
     */
    public async findActiveList(
        order: FindOptionsOrder<SightingOld>,
        skip: number,
        take: number,
        filter?: SightingOldFilterCriteria
    ): Promise<SightingOld[]> {
        const repository = await this._repository;

        return repository.find({
            where: SightingOldRepository._buildWhere(filter),
            order: order,
            skip: skip,
            take: take
        });
    }

    /**
     * Non-deleted old sightings that carry a position, within an optional
     * date range, ordered newest first and capped at `limit`. Feeds the map's
     * historical-sightings layer: rows without a `location_begin` are useless
     * there, so they are filtered out in SQL (not all old rows have one) and
     * the cap isn't wasted on positionless history.
     */
    public async findPointsInRange(
        periodFrom: string | undefined,
        periodTo: string | undefined,
        limit: number
    ): Promise<SightingOld[]> {
        const repository = await this._repository;
        const qb = repository.createQueryBuilder('o')
        .where('o.deleted = :deleted', {deleted: false})
        .andWhere('o.location_begin IS NOT NULL')
        .andWhere('o.location_begin <> \'\'')
        .orderBy('o.date', 'DESC')
        .limit(limit);

        const from = (periodFrom ?? '').trim();
        const to = (periodTo ?? '').trim();

        if (from !== '') {
            qb.andWhere('o.date >= :from', {from: from});
        }
        if (to !== '') {
            qb.andWhere('o.date <= :to', {to: to});
        }

        return qb.getMany();
    }

    /**
     * Load many by id (for detail / batch lookups).
     */
    public async findManyByIds(ids: number[]): Promise<SightingOld[]> {
        if (ids.length === 0) {
            return [];
        }

        const repository = await this._repository;

        return repository.find({where: {id: In(ids)}});
    }

    /**
     * Build the TypeORM where clause from the filter.
     * @private
     */
    private static _buildWhere(filter?: SightingOldFilterCriteria): FindOptionsWhere<SightingOld> {
        const where: FindOptionsWhere<SightingOld> = {deleted: false};

        if (filter?.species_id !== undefined) {
            where.species_id = filter.species_id;
        }

        const periodFrom = (filter?.period_from ?? '').trim();
        const periodTo = (filter?.period_to ?? '').trim();

        if (periodFrom !== '' && periodTo !== '') {
            where.date = Between(periodFrom, periodTo);
        } else if (periodFrom !== '') {
            where.date = Raw((alias) => `${alias} >= :from`, {from: periodFrom});
        } else if (periodTo !== '') {
            where.date = Raw((alias) => `${alias} <= :to`, {to: periodTo});
        }

        return where;
    }

}