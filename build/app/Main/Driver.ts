import {Get, JsonController, Session} from 'routing-controllers';
import {User} from '../../inc/Db/MariaDb/Entity/User';
import {VehicleDriver as VehicleDriverDB} from '../../inc/Db/MariaDb/Entity/VehicleDriver';
import {MariaDbHelper} from '../../inc/Db/MariaDb/MariaDbHelper';

/**
 * DriverEntry
 */
export type DriverEntry = {
    id: number;
    userid: number;
    name: string;
};

/**
 * DriverListResponse
 */
export type DriverListResponse = {
    status: string;
    error?: string;
    list: DriverEntry[];
};

/**
 * Driver
 */
@JsonController()
export class Driver {

    /**
     * getList
     * @param session
     */
    @Get('/json/driver/list')
    public async getList(@Session() session: any): Promise<DriverListResponse> {
        let status = 'ok';
        let errormsg = '';
        const list: DriverEntry[] = [];

        if ((session.user !== undefined) && session.user.isLogin) {
            const drivers = await MariaDbHelper.getConnection()
            .getRepository(VehicleDriverDB)
            .createQueryBuilder('vehicle_driver')
            .leftJoinAndSelect(
                User,
                'user',
                'vehicle_driver.user_id = user.id'
            )
            .getRawMany();

            if (drivers) {
                for (const driver of drivers) {
                    list.push({
                        id: driver.vehicle_driver_id,
                        name: driver.user_full_name,
                        userid: driver.vehicle_driver_user_id
                    });
                }
            }
        } else {
            status = 'error';
            errormsg = 'Please login first!';
        }

        return {
            status,
            error: errormsg,
            list
        };
    }

}