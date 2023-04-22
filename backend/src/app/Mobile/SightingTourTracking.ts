import moment from 'moment';
import {Body, JsonController, Post, Session} from 'routing-controllers';
import {Devices as DevicesDB} from '../../inc/Db/MariaDb/Entity/Devices';
import {SightingTour as SightingTourDB} from '../../inc/Db/MariaDb/Entity/SightingTour';
import {SightingTourTracking as SightingTourTrackingDB} from '../../inc/Db/MariaDb/Entity/SightingTourTracking';
import {MariaDbHelper} from '../../inc/Db/MariaDb/MariaDbHelper';
import {DefaultReturn} from '../../inc/Routes/DefaultReturn';
import {StatusCodes} from '../../inc/Routes/StatusCodes';

export type SightingTourTrackingEntry = {
    unid: string;
    tour_fid: string;
    location: string;
    date: string;
};

export type SightingTourTrackingRequest = {
    list: SightingTourTrackingEntry[];
};

export type SightingTourTrackingResponse = DefaultReturn;

/**
 * SightingTourTracking
 */
@JsonController()
export class SightingTourTracking {

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
                return {
                    statusCode: StatusCodes.INTERNAL_ERROR,
                    msg: 'Device not found!'
                };
            }

            // ---------------------------------------------------------------------------------------------------------

            const sightingTourRepository = MariaDbHelper.getConnection().getRepository(SightingTourDB);
            const sightingTourTrackingRepository = MariaDbHelper.getConnection().getRepository(SightingTourTrackingDB);

            for (const entry of request.list) {
                if (entry.unid !== '') {
                    const tour = await sightingTourRepository.findOne({
                        where: {
                            tour_fid: entry.tour_fid
                        }
                    });

                    if (tour) {
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
                        }
                    }
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