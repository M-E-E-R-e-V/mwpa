import {OpenTourResponse} from 'mwpa_schemas';
import {MobileV1StatusCode} from '../MobileV1.js';
import {GroupRepository} from '../../../Db/MariaDb/Repositories/GroupRepository.js';
import {OrganizationRepository} from '../../../Db/MariaDb/Repositories/OrganizationRepository.js';
import {SightingTourRepository} from '../../../Db/MariaDb/Repositories/SightingTourRepository.js';
import {UserRepository} from '../../../Db/MariaDb/Repositories/UserRepository.js';
import {VehicleDriverRepository} from '../../../Db/MariaDb/Repositories/VehicleDriverRepository.js';
import {VehicleRepository} from '../../../Db/MariaDb/Repositories/VehicleRepository.js';

/**
 * OpenTour
 *
 * NOTE: the old-backend version queried `where: {organization_id: mgroup}` which is a bug
 * (passes the whole group object). This port uses `mgroup.organization_id` as intended.
 */
export class OpenTour {

    /**
     * Return the currently-open tour (status=1) for the user's main organization, with
     * vehicle/driver/organization metadata. Returns 401 if there is no open tour.
     * @param {number} userId
     * @return {OpenTourResponse}
     */
    public static async getOpenTour(userId: number): Promise<OpenTourResponse> {
        const user = await UserRepository.getInstance().findOne(userId);
        if (!user) {
            return {statusCode: MobileV1StatusCode.UNAUTHORIZED};
        }

        const mainGroup = await GroupRepository.getInstance().findOne(user.main_groupid);
        if (!mainGroup) {
            return {statusCode: MobileV1StatusCode.UNAUTHORIZED};
        }

        const tourRepo = await SightingTourRepository.getInstance().getRepository();
        const tour = await tourRepo.findOne({
            where: {
                status: 1,
                organization_id: mainGroup.organization_id
            }
        });
        if (!tour) {
            return {statusCode: MobileV1StatusCode.UNAUTHORIZED};
        }

        const organization = await OrganizationRepository.getInstance().findOne(mainGroup.organization_id);
        const vehicle = await VehicleRepository.getInstance().findOne(tour.vehicle_id);
        const vehicleDriver = await VehicleDriverRepository.getInstance().findOne(tour.vehicle_driver_id);

        if (!organization || !vehicle || !vehicleDriver) {
            return {statusCode: MobileV1StatusCode.UNAUTHORIZED};
        }

        return {
            statusCode: MobileV1StatusCode.OK,
            data: {
                id: tour.id,
                tour_start: tour.tour_start,
                tour_end: tour.tour_end,
                status: tour.status,
                vehicle: {
                    id: vehicle.id,
                    description: vehicle.description
                },
                vehicle_driver: {
                    id: vehicleDriver.id,
                    description: vehicleDriver.description
                },
                organization: {
                    id: organization.id,
                    description: organization.description,
                    country: organization.country,
                    location: organization.location,
                    lat: organization.lat,
                    lon: organization.lon
                }
            }
        };
    }

}