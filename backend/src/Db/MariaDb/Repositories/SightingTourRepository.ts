import {DBRepository} from 'figtree';
import {Between, FindOptionsOrder, FindOptionsWhere, In, Like, Raw} from 'typeorm';
import {SightingTour} from '../Entities/SightingTour.js';

/**
 * Optional filter criteria for {@link SightingTourRepository.findActiveList}.
 * All fields are AND-combined; undefined fields are ignored.
 */
export type SightingTourFilterCriteria = {
    period_from?: string;
    period_to?: string;
    organization_id?: number;
    vehicle_id?: number;
    vehicle_driver_id?: number;
    search?: string;
    only_without_tracks?: boolean;
};

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
            skip: skip,
            take: take
        });
    }

    /**
     * Paginated list of tours, optionally restricted to a set of
     * organization ids and further narrowed by the user-provided filter
     * criteria.
     *
     * Org scoping precedence: when both `organizationIds` (the caller's
     * allow-list, set for non-admins) and `filter.organization_id` (an
     * explicit pick) are present, the explicit pick must be inside the
     * allow-list — otherwise the result is empty (no leak across orgs).
     *
     * Mirrors {@link SightingRepository.findActiveList} so the Tours
     * list endpoint can use the same paginated/filtered pattern.
     * @param {FindOptionsOrder<SightingTour>} order
     * @param {number | undefined} skip
     * @param {number | undefined} take
     * @param {number[] | undefined} organizationIds — when set, restricts results to these orgs
     * @param {SightingTourFilterCriteria | undefined} filter — extra AND-combined criteria
     * @return {{rows: SightingTour[]; count: number}}
     */
    public async findActiveList(
        order: FindOptionsOrder<SightingTour>,
        skip?: number,
        take?: number,
        organizationIds?: number[],
        filter?: SightingTourFilterCriteria
    ): Promise<{rows: SightingTour[]; count: number}> {
        const repository = await this._repository;
        const baseWhere: FindOptionsWhere<SightingTour> = {};

        if (organizationIds !== undefined) {
            if (organizationIds.length === 0) {
                return {rows: [], count: 0};
            }

            if (filter?.organization_id !== undefined && filter.organization_id > 0) {
                if (!organizationIds.includes(filter.organization_id)) {
                    return {rows: [], count: 0};
                }
                baseWhere.organization_id = filter.organization_id;
            } else {
                baseWhere.organization_id = In(organizationIds);
            }
        } else if (filter?.organization_id !== undefined && filter.organization_id > 0) {
            baseWhere.organization_id = filter.organization_id;
        }

        if (filter?.vehicle_id !== undefined && filter.vehicle_id > 0) {
            baseWhere.vehicle_id = filter.vehicle_id;
        }

        if (filter?.vehicle_driver_id !== undefined && filter.vehicle_driver_id > 0) {
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

        if (filter?.only_without_tracks === true) {
            // Subquery as a Raw column constraint — TypeORM doesn't support
            // anti-joins via FindOptionsWhere otherwise, and a separate
            // QueryBuilder would lose the search/OR branch below.
            baseWhere.id = Raw((alias) => `${alias} NOT IN (SELECT DISTINCT sighting_tour_id FROM sighting_tour_tracking)`);
        }

        const search = (filter?.search ?? '').trim();
        let where: FindOptionsWhere<SightingTour> | FindOptionsWhere<SightingTour>[] = baseWhere;
        if (search !== '') {
            const like = Like(`%${search}%`);
            where = [
                {...baseWhere, record_by_persons: like},
                {...baseWhere, tour_fid: like}
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

    /**
     * Return all tours run by a given (vehicle, driver) on a given date.
     * Used by the sighting save endpoint to auto-link a sighting to its tour.
     * Times are compared in caller (string match works for HH:mm but not "9:00" vs "10:00").
     * @param {number} vehicleId
     * @param {number} vehicleDriverId
     * @param {string} date
     * @return {SightingTour[]}
     */
    public async findByCrewAndDate(vehicleId: number, vehicleDriverId: number, date: string): Promise<SightingTour[]> {
        const repository = await this._repository;
        return repository.find({
            where: {
                vehicle_id: vehicleId,
                vehicle_driver_id: vehicleDriverId,
                date: date
            }
        });
    }

    /**
     * Sum of tour-hours per YYYY-MM bucket inside `[periodFrom, periodTo]`,
     * filtered to the supplied orgs when `organizationIds` is set. Used by
     * the Species Profile to compute SPUE (sightings per tour-hour) — the
     * standard effort-corrected encounter rate.
     *
     * tour_start / tour_end are stored as HH:mm strings; the calc is done
     * via SQL TIME arithmetic so the whole aggregation stays in one query
     * (negative deltas — tours crossing midnight — are clamped to 0).
     *
     * @param {string | undefined} periodFrom YYYY-MM-DD inclusive
     * @param {string | undefined} periodTo   YYYY-MM-DD inclusive
     * @param {number[] | undefined} organizationIds
     * @return {Map<string, number>} ym → hours
     */
    public async aggregateMonthlyTourHours(
        periodFrom: string | undefined,
        periodTo: string | undefined,
        organizationIds: number[] | undefined
    ): Promise<Map<string, number>> {
        const out = new Map<string, number>();

        if (organizationIds !== undefined && organizationIds.length === 0) {
            return out;
        }

        const repository = await this._repository;
        const qb = repository.createQueryBuilder('st')
            .select('DATE_FORMAT(st.date, \'%Y-%m\')', 'ym')
            .addSelect(
                'SUM(' +
                'GREATEST(0, ' +
                'TIME_TO_SEC(STR_TO_DATE(NULLIF(st.tour_end, \'\'), \'%H:%i\')) - ' +
                'TIME_TO_SEC(STR_TO_DATE(NULLIF(st.tour_start, \'\'), \'%H:%i\'))' +
                ')) / 3600.0',
                'hours'
            )
            .where('st.tour_start <> \'\'')
            .andWhere('st.tour_end <> \'\'');

        const from = (periodFrom ?? '').trim();
        const to = (periodTo ?? '').trim();
        if (from !== '') {
            qb.andWhere('st.date >= :from', {from});
        }
        if (to !== '') {
            qb.andWhere('st.date <= :to', {to});
        }
        if (organizationIds !== undefined) {
            qb.andWhere('st.organization_id IN (:...orgIds)', {orgIds: organizationIds});
        }

        qb.groupBy('DATE_FORMAT(st.date, \'%Y-%m\')');

        const rows = await qb.getRawMany<{ym: string; hours: number | string | null;}>();
        for (const r of rows) {
            out.set(r.ym, Number(r.hours ?? 0));
        }
        return out;
    }

    /**
     * Closest tour for the same vehicle whose date sits immediately before
     * the given anchor date — used by the tracking-edit UI to suggest a
     * "previous day" tour when shifting points across midnight.
     * @param {number} vehicleId
     * @param {string} date — anchor tour date, YYYY-MM-DD
     * @return {SightingTour | null}
     */
    public async findPrevByVehicle(vehicleId: number, date: string): Promise<SightingTour | null> {
        const repository = await this._repository;
        return repository.findOne({
            where: {
                vehicle_id: vehicleId,
                date: Raw((alias) => `${alias} < :date`, {date})
            },
            order: {
                date: 'DESC',
                tour_start: 'DESC'
            }
        });
    }

    /**
     * Counterpart of {@link findPrevByVehicle}.
     * @param {number} vehicleId
     * @param {string} date
     * @return {SightingTour | null}
     */
    public async findNextByVehicle(vehicleId: number, date: string): Promise<SightingTour | null> {
        const repository = await this._repository;
        return repository.findOne({
            where: {
                vehicle_id: vehicleId,
                date: Raw((alias) => `${alias} > :date`, {date})
            },
            order: {
                date: 'ASC',
                tour_start: 'ASC'
            }
        });
    }

    /**
     * Look up candidate tours for the OrphanTracks-Assign dialog. Each picker
     * field on `criteria` is optional: empty = wildcard. When `tour_start`
     * is set the result is restricted to tours within a ±60 min window and
     * sorted by absolute time distance ascending; otherwise the result is
     * sorted by date desc, tour_start desc.
     *
     * Non-admin callers pass `orgIds` to limit candidates to their orgs.
     *
     * @param {{vehicle_id?: number; vehicle_driver_id?: number; date?: string; tour_start?: string;}} criteria
     * @param {number[] | undefined} orgIds
     * @param {number | undefined} limit
     * @return {SightingTour[]}
     */
    public async findCandidatesForOrphan(
        criteria: {vehicle_id?: number; vehicle_driver_id?: number; date?: string; tour_start?: string;},
        orgIds?: number[],
        limit: number = 50
    ): Promise<SightingTour[]> {
        if (orgIds !== undefined && orgIds.length === 0) {
            return [];
        }

        const repository = await this._repository;
        const qb = repository.createQueryBuilder('st').where('1=1');

        if (criteria.vehicle_id !== undefined && criteria.vehicle_id > 0) {
            qb.andWhere('st.vehicle_id = :vehicleId', {vehicleId: criteria.vehicle_id});
        }

        if (criteria.vehicle_driver_id !== undefined && criteria.vehicle_driver_id > 0) {
            qb.andWhere('st.vehicle_driver_id = :driverId', {driverId: criteria.vehicle_driver_id});
        }

        const date = (criteria.date ?? '').trim();
        if (date !== '') {
            qb.andWhere('st.date = :date', {date});
        }

        const tourStart = (criteria.tour_start ?? '').trim();
        const m = /^(\d{1,2}):(\d{2})$/.exec(tourStart);
        if (m) {
            const targetMin = Number(m[1]) * 60 + Number(m[2]);
            const minutesExpr = '(CAST(SUBSTRING_INDEX(st.tour_start, \':\', 1) AS SIGNED) * 60 + ' +
                'CAST(SUBSTRING_INDEX(st.tour_start, \':\', -1) AS SIGNED))';
            qb.andWhere('st.tour_start <> \'\'');
            qb.andWhere(`ABS(${minutesExpr} - :targetMin) <= 60`, {targetMin});
            qb.addSelect(`ABS(${minutesExpr} - :targetMin)`, 'time_distance');
            qb.orderBy('time_distance', 'ASC');
        } else {
            qb.orderBy('st.date', 'DESC').addOrderBy('st.tour_start', 'DESC');
        }

        if (orgIds !== undefined) {
            qb.andWhere('st.organization_id IN (:...orgIds)', {orgIds});
        }

        qb.limit(limit);

        return qb.getMany();
    }

}