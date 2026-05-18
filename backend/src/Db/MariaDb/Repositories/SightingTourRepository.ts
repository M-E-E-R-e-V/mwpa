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

}