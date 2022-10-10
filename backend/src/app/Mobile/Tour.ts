import {JsonController, Session} from 'routing-controllers';
import {Group as GroupDB} from '../../inc/Db/MariaDb/Entity/Group';
import {Organization as OrganizationDB} from '../../inc/Db/MariaDb/Entity/Organization';
import {SightingTour as SightingTourDB} from '../../inc/Db/MariaDb/Entity/SightingTour';
import {User as UserDB} from '../../inc/Db/MariaDb/Entity/User';
import {Vehicle as VehicleDB} from '../../inc/Db/MariaDb/Entity/Vehicle';
import {VehicleDriver as VehicleDriverDB} from '../../inc/Db/MariaDb/Entity/VehicleDriver';
import {MariaDbHelper} from '../../inc/Db/MariaDb/MariaDbHelper';
import {DefaultReturn} from '../../inc/Routes/DefaultReturn';
import {StatusCodes} from '../../inc/Routes/StatusCodes';

/**
 * OpenTour
 */
export type OpenTour = {
    id: number;
    tour_start: string;
    tour_end: string;
    status: number;
    vehicle_driver: {
        id: number;
        description: string;
    };
    vehicle: {
        id: number;
        description: string;
    };
    organization: {
        id: number;
        description: string;
        country: string;
        location: string;
        lat: string;
        lon: string;
    };
};

export type OpenTourResponse = DefaultReturn & {
    data?: OpenTour;
};

/**
 * Tour
 */
@JsonController()
export class Tour {

    /**
     * getOpenTour
     * @param session
     */
    public async getOpenTour(@Session() session: any): Promise<OpenTourResponse> {
        if ((session.user !== undefined) && session.user.isLogin) {
            const userRepository = MariaDbHelper.getConnection().getRepository(UserDB);
            const groupRepository = MariaDbHelper.getConnection().getRepository(GroupDB);
            const tourRepository = MariaDbHelper.getConnection().getRepository(SightingTourDB);
            const organizatonRepository = MariaDbHelper.getConnection().getRepository(OrganizationDB);
            const vehicleRepository = MariaDbHelper.getConnection().getRepository(VehicleDB);
            const vehicleDriverRepository = MariaDbHelper.getConnection().getRepository(VehicleDriverDB);

            const user = await userRepository.findOne({
                where: {
                    id: session.user.userid
                }
            });

            if (user) {
                const mgroup = await groupRepository.findOne({
                    where: {
                        id: user.main_groupid
                    }
                });

                if (mgroup) {
                    const mtour = await tourRepository.findOne({
                        where: {
                            status: 1,
                            organization_id: mgroup
                        }
                    });

                    if (mtour) {
                        const torganization = await organizatonRepository.findOne({
                            where: {
                                id: mgroup.organization_id
                            }
                        });

                        const tvehicle = await vehicleRepository.findOne({
                            where: {
                                id: mtour.vehicle_id
                            }
                        });

                        const tvehicleDriver = await vehicleDriverRepository.findOne({
                            where: {
                                id: mtour.vehicle_driver_id
                            }
                        });

                        if (torganization && tvehicle && tvehicleDriver) {
                            return {
                                statusCode: StatusCodes.OK,
                                data: {
                                    id: mtour.id,
                                    tour_start: mtour.tour_start,
                                    tour_end: mtour.tour_end,
                                    status: mtour.status,
                                    vehicle: {
                                        id: tvehicle.id,
                                        description: tvehicle.description
                                    },
                                    vehicle_driver: {
                                        id: tvehicleDriver.id,
                                        description: tvehicleDriver.description
                                    },
                                    organization: {
                                        id: torganization.id,
                                        country: torganization.country,
                                        location: torganization.location,
                                        lat: torganization.lat,
                                        lon: torganization.lon,
                                        description: torganization.description
                                    }
                                }
                            };
                        }
                    }
                }
            }
        }

        return {
            statusCode: StatusCodes.UNAUTHORIZED
        };
    }

}