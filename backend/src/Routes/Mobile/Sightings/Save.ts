import {Logger} from 'figtree';
import {Vts} from 'vts';
import {v4 as uuidv4} from 'uuid';
import {SightingSaveResponse, TypeSighting} from 'mwpa_schemas';
import {Const} from '../../../Const.js';
import {Sighting as SightingDB, SightingType} from '../../../Db/MariaDb/Entities/Sighting.js';
import {SightingTour as SightingTourDB} from '../../../Db/MariaDb/Entities/SightingTour.js';
import {DevicesRepository} from '../../../Db/MariaDb/Repositories/DevicesRepository.js';
import {SightingRepository} from '../../../Db/MariaDb/Repositories/SightingRepository.js';
import {SightingTourRepository} from '../../../Db/MariaDb/Repositories/SightingTourRepository.js';
import {Users} from '../../../Users/Users.js';
import {UtilSighting} from '../../../Utils/UtilSighting.js';
import {UtilTourFid} from '../../../Utils/UtilTourFid.js';
import {MobileV1StatusCode} from '../MobileV1.js';

/**
 * Save
 */
export class Save {

    /**
     * Mobile sighting upsert. Validates the device, looks up or creates the parent tour,
     * then either creates a new sighting (uuid + hash), updates an existing one, or signals
     * the client to delete the local copy when the sighting is older than FIX_DELETE_DATE.
     * @param {string} deviceIdentity
     * @param {number} userId
     * @param {number} mainOrganizationId
     * @param {TypeSighting} body
     * @return {SightingSaveResponse}
     */
    public static async save(
        deviceIdentity: string,
        userId: number,
        mainOrganizationId: number,
        body?: TypeSighting
    ): Promise<SightingSaveResponse> {
        if (Vts.isUndefined(body)) {
            return {
                statusCode: MobileV1StatusCode.INTERNAL_ERROR,
                msg: 'Request incomplete'
            };
        }

        const device = await DevicesRepository.getInstance().findByIdentity(deviceIdentity);

        if (!device) {
            Logger.getLogger().warn(`Mobile/Sightings::save: Device not found by: ${deviceIdentity}`);
            return {
                statusCode: MobileV1StatusCode.INTERNAL_ERROR,
                msg: 'Device not found!'
            };
        }

        const ctime = Math.floor(Date.now() / 1000);
        const tourFid = UtilTourFid.createTourFid(body);

        let tour = await SightingTourRepository.getInstance().findByTourFidAndDevice(tourFid, device.id);

        if (!tour) {
            tour = new SightingTourDB();
            tour.tour_fid = tourFid;
            tour.creater_id = userId;
            tour.create_datetime = ctime;
            tour.update_datetime = ctime;
            tour.vehicle_id = body.vehicle_id ?? 0;
            tour.vehicle_driver_id = body.vehicle_driver_id ?? 0;
            tour.beaufort_wind = body.beaufort_wind ?? '';
            tour.date = body.date ?? '';
            tour.tour_start = body.tour_start ?? '';
            tour.tour_end = body.tour_end ?? '';
            tour.organization_id = mainOrganizationId;
            tour.status = 2; // closed by default for mobile-inserted tours
            tour.record_by_persons = '';
            tour.device_id = device.id;
            tour = await SightingTourRepository.getInstance().save(tour);
        }

        const hash = await UtilSighting.createHash(body);
        let sighting: SightingDB | null = null;

        if (body.unid) {
            sighting = await SightingRepository.getInstance().findByUnid(body.unid);
        }

        if (sighting === null) {
            sighting = await SightingRepository.getInstance().findByHash(hash);
        }

        if (sighting === null) {
            sighting = new SightingDB();
            sighting.unid = uuidv4();
            sighting.syncblock = false;
            Logger.getLogger().info(`Mobile/Sightings::save: new sighting unid: ${sighting.unid}`);
        } else {
            // existing sighting — check if it's overtime and the client should delete its local copy
            const sightingDate = sighting.date ? new Date(sighting.date.split(' ')[0]) : new Date(0);
            if (Number.isFinite(sightingDate.getTime()) && sightingDate < Const.FIX_DELETE_DATE) {
                Logger.getLogger().info(`Mobile/Sightings::save: overtime, signal delete by unid: ${sighting.unid}`);
                return {
                    statusCode: MobileV1StatusCode.OK,
                    unid: sighting.unid,
                    canDelete: true
                };
            }

            // sync-blocked sightings are returned unchanged (treat as success)
            if (sighting.syncblock) {
                return {
                    statusCode: MobileV1StatusCode.OK,
                    unid: sighting.unid
                };
            }
        }

        const createrId = body.creater_id === 0 || body.creater_id === undefined ? userId : body.creater_id;
        const organization = await Users.getMainOrganization(createrId);
        const organizationId = organization?.id ?? 0;

        sighting.creater_id = createrId;
        sighting.create_datetime = ctime;
        sighting.update_datetime = ctime;
        sighting.device_id = device.id;
        sighting.vehicle_id = body.vehicle_id ?? 0;
        sighting.vehicle_driver_id = body.vehicle_driver_id ?? 0;
        sighting.beaufort_wind_n = body.beaufort_wind ?? '';
        sighting.date = body.date ?? '';
        sighting.tour_id = tour.id;
        sighting.tour_fid = tourFid;
        sighting.tour_start = body.tour_start ?? '';
        sighting.tour_end = body.tour_end ?? '';
        sighting.duration_from = body.duration_from ?? '';
        sighting.duration_until = body.duration_until ?? '';
        sighting.location_begin = body.location_begin ?? '';
        sighting.location_end = body.location_end ?? '';
        sighting.photo_taken = body.photo_taken ?? 0;
        sighting.distance_coast = body.distance_coast ?? '';
        sighting.distance_coast_estimation_gps = body.distance_coast_estimation_gps ?? 0;
        sighting.species_id = body.species_id ?? 0;
        sighting.species_count = body.species_count ?? 0;
        sighting.juveniles = body.juveniles ?? 0;
        sighting.calves = body.calves ?? 0;
        sighting.newborns = body.newborns ?? 0;
        sighting.behaviours = body.behaviours ?? '';
        sighting.subgroups = body.subgroups ?? 0;
        sighting.group_structure_id = body.group_structure_id ?? 0;
        sighting.reaction_id = body.reaction_id ?? 0;
        sighting.freq_behaviour = body.freq_behaviour ?? '';
        sighting.recognizable_animals = body.recognizable_animals ?? '';
        sighting.other_species = body.other_species ?? '';
        sighting.other = body.other ?? '';
        sighting.other_vehicle = body.other_vehicle ?? '';
        sighting.note = body.note ?? '';
        sighting.hash = hash;
        sighting.hash_import_count = 0;
        sighting.source_import_file = '';
        sighting.organization_id = organizationId;
        sighting.sighting_type = body.sightingType ?? SightingType.NORMAL;

        sighting = await SightingRepository.getInstance().save(sighting);

        Logger.getLogger().info(`Mobile/Sightings::save: saved unid: ${sighting.unid} id: ${sighting.id}`);

        return {
            statusCode: MobileV1StatusCode.OK,
            unid: sighting.unid
        };
    }

}