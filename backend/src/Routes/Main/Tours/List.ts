import {StatusCodes} from 'figtree-schemas';
import {FindOptionsOrder} from 'typeorm';
import {TourEntry, ToursCreater, ToursDevice, ToursFilter, ToursListResponse} from 'mwpa_schemas';
import {SightingTour as SightingTourDB} from '../../../Db/MariaDb/Entities/SightingTour.js';
import {DevicesRepository} from '../../../Db/MariaDb/Repositories/DevicesRepository.js';
import {SightingRepository} from '../../../Db/MariaDb/Repositories/SightingRepository.js';
import {SightingTourRepository} from '../../../Db/MariaDb/Repositories/SightingTourRepository.js';
import {SightingTourTrackingRepository} from '../../../Db/MariaDb/Repositories/SightingTourTrackingRepository.js';
import {UserRepository} from '../../../Db/MariaDb/Repositories/UserRepository.js';
import {Users} from '../../../Users/Users.js';

type ToursOrder = NonNullable<ToursFilter['order']>;
const ORDER_FIELDS: (keyof ToursOrder)[] = [
    'id',
    'date',
    'tour_start',
    'tour_end',
    'create_datetime',
    'update_datetime'
];

/**
 * List
 */
export class List {

    /**
     * Build the typeorm `order` object from the request filter.
     * Empty strings mean "skip this field". Defaults to date+tour_start desc when no order given.
     *
     * Sort by count_sightings / count_trackings is intentionally NOT pushed
     * to SQL — those columns don't live on `sighting_tour` and the per-page
     * batched counts arrive *after* the rows. Frontend handles those two
     * sort keys client-side.
     */
    private static _buildOrder(filter?: ToursFilter): FindOptionsOrder<SightingTourDB> {
        if (!filter?.order) {
            return {
                date: 'DESC',
                tour_start: 'DESC'
            };
        }

        const order: Record<string, 'ASC' | 'DESC'> = {};
        for (const field of ORDER_FIELDS) {
            const value = filter.order[field];
            if (value && value !== '') {
                order[field] = value.toLowerCase() === 'asc' ? 'ASC' : 'DESC';
            }
        }
        return order as FindOptionsOrder<SightingTourDB>;
    }

    /**
     * Paginated tour list. Non-admins see only tours from their organizations;
     * the optional filter fields (period, vehicle, driver, organization, search)
     * are AND-combined on top. Per-tour sighting + tracking counts are bulk-fetched
     * for the visible page (one GROUP BY per kind, not N queries).
     * @param {number} userId
     * @param {boolean} isAdmin
     * @param {ToursFilter} filter
     * @return {ToursListResponse}
     */
    public static async getList(
        userId: number,
        isAdmin: boolean,
        filter?: ToursFilter
    ): Promise<ToursListResponse> {
        const order = List._buildOrder(filter);
        const orgIds = isAdmin ? undefined : await Users.getOrganizationIds(userId);

        const {rows, count} = await SightingTourRepository.getInstance().findActiveList(
            order,
            filter?.offset,
            filter?.limit,
            orgIds,
            {
                period_from: filter?.period_from,
                period_to: filter?.period_to,
                organization_id: filter?.organization_id,
                vehicle_id: filter?.vehicle_id,
                vehicle_driver_id: filter?.vehicle_driver_id,
                search: filter?.search
            }
        );

        // Bulk-fetch per-tour counts in one GROUP BY each (cheaper than the
        // legacy N*2 round-trips when listing 50 tours per page).
        const tourFids = rows.map((t) => t.tour_fid);
        const tourIds = rows.map((t) => t.id);
        const [sightingCounts, trackingCounts] = await Promise.all([
            SightingRepository.getInstance().countGroupedByTourFid(tourFids),
            SightingTourTrackingRepository.getInstance().countGroupedByTour(tourIds)
        ]);

        const list: TourEntry[] = [];
        const deviceMap = new Map<number, ToursDevice>();
        const createrMap = new Map<number, ToursCreater>();

        for (const tour of rows) {
            if (!deviceMap.has(tour.device_id)) {
                const device = await DevicesRepository.getInstance().findOne(tour.device_id);
                if (device) {
                    deviceMap.set(device.id, {
                        id: device.id,
                        name: device.description
                    });
                }
            }

            if (!createrMap.has(tour.creater_id)) {
                const user = await UserRepository.getInstance().findOne(tour.creater_id);
                if (user) {
                    createrMap.set(user.id, {
                        id: user.id,
                        name: user.username
                    });
                }
            }

            list.push({
                id: tour.id,
                tour_fid: tour.tour_fid,
                device_id: tour.device_id,
                creater_id: tour.creater_id,
                create_datetime: tour.create_datetime,
                update_datetime: tour.update_datetime,
                vehicle_id: tour.vehicle_id,
                vehicle_driver_id: tour.vehicle_driver_id,
                beaufort_wind: tour.beaufort_wind,
                date: tour.date,
                tour_start: tour.tour_start,
                tour_end: tour.tour_end,
                organization_id: tour.organization_id,
                status: tour.status,
                record_by_persons: tour.record_by_persons,
                count_sightings: sightingCounts.get(tour.tour_fid) ?? 0,
                count_trackings: trackingCounts.get(tour.id) ?? 0
            });
        }

        return {
            statusCode: StatusCodes.OK,
            filter,
            count,
            offset: filter?.offset ?? 0,
            list,
            devices: Array.from(deviceMap.values()),
            creaters: Array.from(createrMap.values())
        };
    }

}