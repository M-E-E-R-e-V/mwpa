import * as fs from 'fs';
import * as Path from 'path';
import {Body, JsonController, Post, Session} from 'routing-controllers';
import {Config} from '../../inc/Config/Config';
import {Devices as DevicesDB} from '../../inc/Db/MariaDb/Entity/Devices';
import {Sighting as SightingDB} from '../../inc/Db/MariaDb/Entity/Sighting';
import {SightingTour as SightingTourDB} from '../../inc/Db/MariaDb/Entity/SightingTour';
import {MariaDbHelper} from '../../inc/Db/MariaDb/MariaDbHelper';
import {DefaultReturn} from '../../inc/Routes/DefaultReturn';
import {StatusCodes} from '../../inc/Routes/StatusCodes';
import {v4 as uuidv4} from 'uuid';
import {TypeSighting} from '../../inc/Types/TypeSighting';
import {DateHelper} from '../../inc/Utils/DateHelper';
import {UtilSighting} from '../../inc/Utils/UtilSighting';
import {UtilTourFid} from '../../inc/Utils/UtilTourFid';

/**
 * SightingSaveResponse
 */
export type SightingSaveResponse = DefaultReturn & {
    unid?: string;
};

/**
 * SightingMobile
 */
export type SightingMobile = TypeSighting;

/**
 * SightingImageExist
 */
export type SightingImageExist = {
    unid?: string;
    filename?: string;
    size?: number;
};

/**
 * SightingImageExistResponse
 */
export type SightingImageExistResponse = DefaultReturn & {
    exist?: boolean;
};

/**
 * SightingImageSavePart
 */
export type SightingImageSavePart = {
    unid?: string;
    filename?: string;
    size?: number;
    offset?: number;
    data?: string;
};

/**
 * SightingImageSaveResponse
 */
export type SightingImageSaveResponse = DefaultReturn;

/**
 * Sightings
 */
@JsonController()
export class Sightings {

    /**
     * save
     * @param session
     * @param request
     */
    @Post('/mobile/sighting/save')
    public async save(@Session() session: any, @Body() request: SightingMobile): Promise<SightingSaveResponse> {
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

            const ctime = DateHelper.getCurrentDbTime();
            const tourFid = UtilTourFid.createMSTourFid(request);

            const sightingTourRepository = MariaDbHelper.getConnection().getRepository(SightingTourDB);
            let tour = await sightingTourRepository.findOne({
                where: {
                    tour_fid: tourFid
                }
            });

            if (!tour) {
                tour = new SightingTourDB();
                tour.tour_fid = tourFid;
                tour.creater_id = session.user.userid;
                tour.create_datetime = ctime;
                tour.update_datetime = ctime;
                tour.vehicle_id = request.vehicle_id || 0;
                tour.vehicle_driver_id = request.vehicle_driver_id || 0;
                tour.beaufort_wind = request.beaufort_wind || 0;
                tour.date = request.date || '';
                tour.tour_start = request.tour_start || '';
                tour.tour_end = request.tour_end || '';
                tour.organization_id = session.user.main_organization_id;

                // default is close by tour insert from mobile
                tour.status = 2;

                tour.record_by_persons = '';

                tour = await MariaDbHelper.getConnection().manager.save(tour);
            }

            // ---------------------------------------------------------------------------------------------------------

            const sightingRepository = MariaDbHelper.getConnection().getRepository(SightingDB);

            const hash = await UtilSighting.createMSHash(request);
            let sighting: SightingDB | undefined;

            if (request.unid) {
                sighting = await sightingRepository.findOne({
                    where: {
                        unid: request.unid
                    }
                });
            }

            if (sighting === undefined) {
                sighting = await sightingRepository.findOne({
                    where: {
                        hash
                    }
                });
            }

            if (sighting === undefined) {
                const uuid = uuidv4();
                sighting = new SightingDB();
                sighting.unid = uuid;
            }

            if (sighting) {
                sighting.creater_id = session.user.userid;
                sighting.create_datetime = ctime;
                sighting.update_datetime = ctime;
                sighting.device_id = device.id;
                sighting.vehicle_id = request.vehicle_id || 0;
                sighting.vehicle_driver_id = request.vehicle_driver_id || 0;
                sighting.beaufort_wind = request.beaufort_wind || 0;
                sighting.date = request.date || '';
                sighting.tour_id = tour?.id!;
                sighting.tour_fid = tourFid;
                sighting.tour_start = request.tour_start || '';
                sighting.tour_end = request.tour_end || '';
                sighting.duration_from = request.duration_from || '';
                sighting.duration_until = request.duration_until || '';
                sighting.location_begin = request.location_begin || '';
                sighting.location_end = request.location_end || '';
                sighting.photo_taken = request.photo_taken || 0;
                sighting.distance_coast = request.distance_coast || '';
                sighting.distance_coast_estimation_gps = request.distance_coast_estimation_gps || 0;
                sighting.species_id = request.species_id || 0;
                sighting.species_count = request.species_count || 0;
                sighting.juveniles = request.juveniles || 0;
                sighting.calves = request.calves || 0;
                sighting.newborns = request.newborns || 0;
                sighting.behaviours = request.behaviours || '';
                sighting.subgroups = request.subgroups || 0;
                sighting.reaction_id = request.reaction_id || 0;
                sighting.freq_behaviour = request.freq_behaviour || '';
                sighting.recognizable_animals = request.recognizable_animals || '';
                sighting.other_species = request.other_species || '';
                sighting.other = request.other || '';
                sighting.other_vehicle = request.other_vehicle || '';
                sighting.note = request.note || '';
                sighting.hash = hash;
                sighting.hash_import_count = 0;
                sighting.source_import_file = '';
                sighting.organization_id = session.user.main_organization_id;

                sighting = await MariaDbHelper.getConnection().manager.save(sighting);

                return {
                    statusCode: StatusCodes.OK,
                    unid: sighting.unid
                };
            }
        }

        return {
            statusCode: StatusCodes.UNAUTHORIZED
        };
    }

    /**
     * existImage
     * @param session
     * @param request
     */
    public async existImage(@Session() session: any, @Body() request: SightingImageExist): Promise<SightingImageExistResponse> {
        if ((session.user !== undefined) && session.user.isLogin && session.user.isMobileLogin) {
            // TODO
        }

        return {
            statusCode: StatusCodes.UNAUTHORIZED
        };
    }

    @Post('/mobile/sighting/image/save')
    public async saveImage(@Session() session: any, @Body() request: SightingImageSavePart): Promise<SightingImageSaveResponse> {
        if ((session.user !== undefined) && session.user.isLogin && session.user.isMobileLogin) {
            const deviceIdentity = session.user.deviceIdentity;
            const config = Config.get();

            if (config?.datadir !== null && fs.existsSync(config?.datadir!)) {
                const sightingDir = Path.join(config?.datadir!, 'sighting');

                if (!fs.existsSync(sightingDir)) {
                    fs.mkdirSync(sightingDir, 0o744);
                }

                const sightingUidDir = Path.join(sightingDir, request.unid!);

                if (!fs.existsSync(sightingUidDir)) {
                    fs.mkdirSync(sightingUidDir, 0o744);
                }

                console.log(request);

                return {
                    statusCode: StatusCodes.OK
                };
            }

            return {
                statusCode: StatusCodes.INTERNAL_ERROR,
                msg: 'Image upload faild, data director not found!'
            };
        }

        return {
            statusCode: StatusCodes.UNAUTHORIZED
        };
    }

}