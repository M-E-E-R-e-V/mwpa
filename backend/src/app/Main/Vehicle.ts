import {Get, JsonController, Session} from 'routing-controllers';
import {Vehicle as VehicleDB} from '../../inc/Db/MariaDb/Entity/Vehicle';
import {MariaDbHelper} from '../../inc/Db/MariaDb/MariaDbHelper';
import {DefaultReturn} from '../../inc/Routes/DefaultReturn';
import {StatusCodes} from '../../inc/Routes/StatusCodes';

/**
 * VehicleEntry
 */
export type VehicleEntry = {
    id: number;
    name: string;
    isdeleted: boolean;
};

/**
 * VehicleListResponse
 */
export type VehicleListResponse = DefaultReturn & {
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
        if ((session.user !== undefined) && session.user.isLogin) {
            const list: VehicleEntry[] = [];

            const vehicleRepository = MariaDbHelper.getConnection().getRepository(VehicleDB);
            const vehicles = await vehicleRepository.find();

            for (const avehicle of vehicles) {
                list.push({
                    id: avehicle.id,
                    name: avehicle.description,
                    isdeleted: avehicle.isdeleted
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