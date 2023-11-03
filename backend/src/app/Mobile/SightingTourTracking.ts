import moment from 'moment';
import {Body, JsonController, Post, Session} from 'routing-controllers';
import {Devices as DevicesDB} from '../../inc/Db/MariaDb/Entity/Devices';
import {SightingTour as SightingTourDB} from '../../inc/Db/MariaDb/Entity/SightingTour';
import {SightingTourTracking as SightingTourTrackingDB} from '../../inc/Db/MariaDb/Entity/SightingTourTracking';
import {MariaDbHelper} from '../../inc/Db/MariaDb/MariaDbHelper';
import {Logger} from '../../inc/Logger/Logger';
import {DefaultReturn} from '../../inc/Routes/DefaultReturn';
import {StatusCodes} from '../../inc/Routes/StatusCodes';

/**
 * SightingTourTrackingEntry
 */
export type SightingTourTrackingEntry = {
    unid: string;
    tour_fid: string;
    location: string;
    date: string;
};

/**
 * SightingTourTrackingRequest
 */
export type SightingTourTrackingRequest = {
    list: SightingTourTrackingEntry[];
};

/**
 * SightingTourTrackingResponse
 */
export type SightingTourTrackingResponse = DefaultReturn;

/**
 * SightingTourTrackingCheckRequest
 */
export type SightingTourTrackingCheckRequest = {
    tour_fid: string;
    count: number;
};

/**
 * SightingTourTracking
 */
@JsonController()
export class SightingTourTracking {

    /**
     * check
     * @param session
     * @param request
     */
    @Post('/mobile/sighting/tourtracking/check')
    public async check(@Session() session: any, @Body() request: SightingTourTrackingCheckRequest): Promise<DefaultReturn> {
        if ((session.user !== undefined) && session.user.isLogin && session.user.isMobileLogin) {
            const deviceIdentity = session.user.deviceIdentity;

            const devicesRepository = MariaDbHelper.getConnection().getRepository(DevicesDB);
            const device = await devicesRepository.findOne({
                where: {
                    identity: deviceIdentity
                }
            });

            if (!device) {
                Logger.log(`Mobile/SightingTourTracking::check: Device not found by: ${deviceIdentity}`);

                return {
                    statusCode: StatusCodes.INTERNAL_ERROR,
                    msg: 'Device not found!'
                };
            }

            // ---------------------------------------------------------------------------------------------------------

            const sightingTourRepository = MariaDbHelper.getConnection().getRepository(SightingTourDB);
            const tour = await sightingTourRepository.findOne({
                where: {
                    tour_fid: request.tour_fid,
                    device_id: device.id
                }
            });

            if (tour) {
                const sightingTourTrackingRepository = MariaDbHelper.getConnection().getRepository(
                    SightingTourTrackingDB
                );

                const tcount = await sightingTourTrackingRepository.count({
                    where: {
                        sighting_tour_id: tour.id
                    }
                });

                if (tcount === request.count) {
                    return {
                        statusCode: StatusCodes.OK
                    };
                }

                Logger.log(`Mobile/SightingTourTracking::check: count is different by tour_fid: ${request.tour_fid}, count db: ${tcount}, count device: ${request.count}`);
            } else {
                Logger.log(`Mobile/SightingTourTracking::check: Tour not found by tour_fid: ${request.tour_fid}, count device: ${request.count}`);
            }

            return {
                statusCode: StatusCodes.INTERNAL_ERROR
            };
        }

        return {
            statusCode: StatusCodes.UNAUTHORIZED
        };
    }

    /**
     * save
     * @param session
     * @param request
     */
    @Post('/mobile/sighting/tourtracking/save')
    public async save(@Session() session: any, @Body() request: SightingTourTrackingRequest): Promise<SightingTourTrackingResponse> {
        if ((session.user !== undefined) && session.user.isLogin && session.user.isMobileLogin) {
            const deviceIdentity = session.user.deviceIdentity;

            const devicesRepository = MariaDbHelper.getConnection().getRepository(DevicesDB);
            const device = await devicesRepository.findOne({
                where: {
                    identity: deviceIdentity
                }
            });

            if (!device) {
                Logger.log(`Mobile/SightingTourTracking::save: Device not found by: ${deviceIdentity}`);

                return {
                    statusCode: StatusCodes.INTERNAL_ERROR,
                    msg: 'Device not found!'
                };
            }

            // ---------------------------------------------------------------------------------------------------------

            const sightingTourRepository = MariaDbHelper.getConnection().getRepository(SightingTourDB);
            const sightingTourTrackingRepository = MariaDbHelper.getConnection().getRepository(SightingTourTrackingDB);

            const groupList: Map<string, SightingTourTrackingEntry[]> = new Map<string, SightingTourTrackingEntry[]>();

            // ---------------------------------------------------------------------------------------------------------

            for (const entry of request.list) {
                if (entry.unid === '') {
                    Logger.log(`Mobile/SightingTourTracking::save: Entry unid is empty, by tour_fid: ${entry.tour_fid}`);
                } else {
                    if (!groupList.has(entry.tour_fid)) {
                        groupList.set(entry.tour_fid, [] as SightingTourTrackingEntry[]);
                    }

                    const tlist = groupList.get(entry.tour_fid);

                    if (tlist) {
                        tlist.push(entry);
                        groupList.set(entry.tour_fid, tlist);
                    } else {
                        Logger.log(`Mobile/SightingTourTracking::save: tlist is not set in the map, by tour_fid: ${entry.tour_fid}`);
                    }
                }
            }

            // ---------------------------------------------------------------------------------------------------------

            for (const [tour_fid, value] of groupList) {
                const tour = await sightingTourRepository.findOne({
                    where: {
                        tour_fid,
                        device_id: device.id
                    }
                });

                if (tour) {
                    let countAdd = 0;
                    let countExist = 0;

                    for (const entry of value) {
                        const track = await sightingTourTrackingRepository.findOne({
                            where: {
                                unid: entry.unid
                            }
                        });

                        if (!track) {
                            const date = moment(entry.date);

                            const nTrack = new SightingTourTrackingDB();
                            nTrack.unid = entry.unid;
                            nTrack.create_datetime = date.unix();
                            nTrack.sighting_tour_id = tour.id;
                            nTrack.position = entry.location;

                            await MariaDbHelper.getConnection().manager.save(nTrack);

                            countAdd++;
                        }

                        countExist++;
                    }

                    Logger.log(`Mobile/SightingTourTracking::save: add tracks: ${countAdd}, exist tracks: ${countExist} by tour_fid: ${tour_fid}`);
                } else {
                    Logger.log(`Mobile/SightingTourTracking::save: tour not found by tour_fid: ${tour_fid}`);
                }
            }

            return {
                statusCode: StatusCodes.OK
            };
        }

        return {
            statusCode: StatusCodes.UNAUTHORIZED
        };
    }

}