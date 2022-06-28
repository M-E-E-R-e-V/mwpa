import {Get, JsonController, Session} from 'routing-controllers';
import {Vehicle as VehicleDB} from '../../inc/Db/MariaDb/Entity/Vehicle';
import {MariaDbHelper} from '../../inc/Db/MariaDb/MariaDbHelper';

/**
 * VehicleEntry
 */
export type VehicleEntry = {
    id: number;
    name: string;
};

/**
 * VehicleListResponse
 */
export type VehicleListResponse = {
    status: string;
    error?: string;
    list: VehicleEntry[];
};

/**
 * Vehicle
 */
@JsonController()
export class Vehicle {

    /**
     * getList
     * @param session
     */
    @Get('/json/vehicle/list')
    public async getList(@Session() session: any): Promise<VehicleListResponse> {
        let status = 'ok';
        let errormsg = '';
        const list: VehicleEntry[] = [];

        if ((session.user !== undefined) && session.user.isLogin) {
            const vehicleRepository = MariaDbHelper.getConnection().getRepository(VehicleDB);
            const vehicles = await vehicleRepository.find();

            for (const avehicle of vehicles) {
                list.push({
                    id: avehicle.id,
                    name: avehicle.description
                });
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