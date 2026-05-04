import {StatusCodes} from 'figtree-schemas';
import {TourEntry, ToursCreater, ToursDevice, ToursFilter, ToursListResponse} from 'mwpa_schemas';
import {DevicesRepository} from '../../../Db/MariaDb/Repositories/DevicesRepository.js';
import {SightingRepository} from '../../../Db/MariaDb/Repositories/SightingRepository.js';
import {SightingTourRepository} from '../../../Db/MariaDb/Repositories/SightingTourRepository.js';
import {SightingTourTrackingRepository} from '../../../Db/MariaDb/Repositories/SightingTourTrackingRepository.js';
import {UserRepository} from '../../../Db/MariaDb/Repositories/UserRepository.js';

/**
 * List
 */
export class List {

    /**
     * Return paginated tours plus the device + creater lookups referenced by them.
     * @param {ToursFilter} filter
     * @return {ToursListResponse}
     */
    public static async getList(filter?: ToursFilter): Promise<ToursListResponse> {
        const tourRepo = SightingTourRepository.getInstance();

        const count = await tourRepo.countAll();
        const tours = await tourRepo.findOrdered(filter?.offset, filter?.limit);

        const list: TourEntry[] = [];
        const deviceMap = new Map<number, ToursDevice>();
        const createrMap = new Map<number, ToursCreater>();

        for (const tour of tours) {
            const countSightings = await SightingRepository.getInstance().countByTourFid(tour.tour_fid);
            const countTrackings = await SightingTourTrackingRepository.getInstance().countByTour(tour.id);

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
                count_sightings: countSightings,
                count_trackings: countTrackings
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