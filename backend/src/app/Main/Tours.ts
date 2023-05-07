import {Body, JsonController, Post, Session} from 'routing-controllers';
import {Sighting as SightingDB} from '../../inc/Db/MariaDb/Entity/Sighting';
import {SightingTour as SightingTourDB} from '../../inc/Db/MariaDb/Entity/SightingTour';
import {SightingTourTracking as SightingTourTrackingDB} from '../../inc/Db/MariaDb/Entity/SightingTourTracking';
import {MariaDbHelper} from '../../inc/Db/MariaDb/MariaDbHelper';
import {DefaultReturn} from '../../inc/Routes/DefaultReturn';
import {StatusCodes} from '../../inc/Routes/StatusCodes';

/**
 * ToursFilter
 */
export type ToursFilter = {
    year?: number;
    limit?: number;
    offset?: number;
};

/**
 * TourEntry
 */
export type TourEntry = {
    id: number;
    tour_fid: string;
    creater_id: number;
    create_datetime: number;
    update_datetime: number;
    vehicle_id: number;
    vehicle_driver_id: number;
    beaufort_wind: string;
    date: string;
    tour_start: string;
    tour_end: string;
    organization_id: number;
    status: number;
    record_by_persons: string;
    count_sightings: number;
    count_trackings: number;
};

/**
 * ToursResponse
 */
export type ToursResponse = DefaultReturn & {
    filter?: ToursFilter;
    offset?: number;
    count?: number;
    list?: TourEntry[];
};

/**
 * Tours
 */
@JsonController()
export class Tours {

    /**
     * getList
     * @param filter
     * @param session
     */
    @Post('/json/tours/list')
    public async getList(@Body() filter: ToursFilter, @Session() session: any): Promise<ToursResponse> {
        if ((session.user !== undefined) && session.user.isLogin) {
            const tourRepository = MariaDbHelper.getConnection().getRepository(SightingTourDB);
            const sightingRepository = MariaDbHelper.getConnection().getRepository(SightingDB);
            const tourTrackRepository = MariaDbHelper.getConnection().getRepository(SightingTourTrackingDB);

            const list: TourEntry[] = [];
            const count = await tourRepository.count();
            const dblist = await tourRepository.find({
                order: {
                    date: 'DESC',
                    tour_start: 'DESC'
                },
                skip: filter.offset,
                take: filter.limit
            });

            for (const entry of dblist) {
                const countSigh = await sightingRepository.count({
                    where: {
                        tour_fid: entry.tour_fid
                    }
                });

                const countTrack = await tourTrackRepository.count({
                    where: {
                        sighting_tour_id: entry.id
                    }
                });

                list.push({
                    id: entry.id,
                    tour_fid: entry.tour_fid,
                    creater_id: entry.creater_id,
                    create_datetime: entry.create_datetime,
                    update_datetime: entry.update_datetime,
                    vehicle_id: entry.vehicle_id,
                    vehicle_driver_id: entry.vehicle_driver_id,
                    beaufort_wind: entry.beaufort_wind,
                    date: entry.date,
                    tour_start: entry.tour_start,
                    tour_end: entry.tour_end,
                    organization_id: entry.organization_id,
                    status: entry.status,
                    record_by_persons: entry.record_by_persons,
                    count_sightings: countSigh,
                    count_trackings: countTrack
                });
            }

            return {
                statusCode: StatusCodes.OK,
                filter,
                count,
                offset: filter.offset ? filter.offset : 0,
                list
            };
        }

        return {
            statusCode: StatusCodes.UNAUTHORIZED
        };
    }

}