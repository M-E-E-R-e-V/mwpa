import {Get, JsonController, Session} from 'routing-controllers';
import {MariaDbHelper} from '../../inc/Db/MariaDb/MariaDbHelper';
import {DefaultReturn} from '../../inc/Routes/DefaultReturn';
import {StatusCodes} from '../../inc/Routes/StatusCodes';
import {VehicleDriver as VehicleDriverDB} from '../../inc/Db/MariaDb/Entity/VehicleDriver';

/**
 * VehicleDriverEntry
 */
export type VehicleDriverEntry = {
    id: number;
    user_id: number;
    description: string;
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

            const vehicleDriverRepository = MariaDbHelper.getConnection().getRepository(VehicleDriverDB);
            const vehicleDrivers = await vehicleDriverRepository.find();

            for (const vehicleDriver of vehicleDrivers) {
                list.push({
                    id: vehicleDriver.id,
                    user_id: vehicleDriver.user_id,
                    description: vehicleDriver.description
                });
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