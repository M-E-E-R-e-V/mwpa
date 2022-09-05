import {Get, JsonController, Session} from 'routing-controllers';
import {Vehicle as MainVehicle, VehicleListResponse} from '../Main/Vehicle';

/**
 * Species
 */
@JsonController()
export class Vehicle extends MainVehicle {

    /**
     * getList
     * @param session
     */
    @Get('/mobile/vehicle/list')
    public async getList(@Session() session: any): Promise<VehicleListResponse> {
        return super.getList(session);
    }

}