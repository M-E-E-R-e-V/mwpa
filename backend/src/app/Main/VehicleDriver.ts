import {Get, JsonController, Session} from 'routing-controllers';
import {User as UserDB} from '../../inc/Db/MariaDb/Entity/User';
import {MariaDbHelper} from '../../inc/Db/MariaDb/MariaDbHelper';
import {DefaultReturn} from '../../inc/Routes/DefaultReturn';
import {StatusCodes} from '../../inc/Routes/StatusCodes';
import {VehicleDriver as VehicleDriverDB} from '../../inc/Db/MariaDb/Entity/VehicleDriver';

/**
 * VehicleDriverEntry
 */
export type VehicleDriverEntry = {
    id: number;
    description: string;
    user: {
        user_id: number;
        name: string;
    };
};

/**
 * VehicleDriverListResponse
 */
export type VehicleDriverListResponse = DefaultReturn & {
    list: VehicleDriverEntry[];
};

/**
 * VehicleDriver
 */
@JsonController()
export class VehicleDriver {

    /**
     * getList
     * @param session
     */
    @Get('/json/vehicledriver/list')
    public async getList(@Session() session: any): Promise<VehicleDriverListResponse> {
        if ((session.user !== undefined) && session.user.isLogin) {
            const list: VehicleDriverEntry[] = [];

            const drivers = await MariaDbHelper.getConnection()
            .getRepository(VehicleDriverDB)
            .createQueryBuilder('vehicle_driver')
            .leftJoinAndSelect(
                UserDB,
                'user',
                'vehicle_driver.user_id = user.id'
            )
            .getRawMany();


            if (drivers) {
                for (const driver of drivers) {
                    list.push({
                        id: driver.id,
                        description: driver.description,
                        user: {
                            user_id: driver.user_id,
                            name: driver.user_full_name
                        }
                    });
                }
            }

            return {
                statusCode: StatusCodes.OK,
                list
            };
        }

        return {
            statusCode: StatusCodes.UNAUTHORIZED,
            list: []
        };
    }

}