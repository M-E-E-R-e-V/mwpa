import {Get, JsonController, Session} from 'routing-controllers';
import {VehicleDriver as MainVehicleDriver, VehicleDriverListResponse} from '../Main/VehicleDriver';

@JsonController()
export class VehicleDriver extends MainVehicleDriver {

    /**
     * getList
     * @param session
     */
    @Get('/mobile/vehicledriver/list')
    public async getList(@Session() session: any): Promise<VehicleDriverListResponse> {
        return super.getList(session);
    }

}