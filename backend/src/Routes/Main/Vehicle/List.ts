import {StatusCodes} from 'figtree-schemas';
import {VehicleEntry, VehicleListResponse} from 'mwpa_schemas';
import {VehicleRepository} from '../../../Db/MariaDb/Repositories/VehicleRepository.js';

/**
 * List
 */
export class List {

    /**
     * Return all vehicles. The schema field "name" maps to the entity column "description".
     * @return {VehicleListResponse}
     */
    public static async getList(): Promise<VehicleListResponse> {
        const vehicles = await VehicleRepository.getInstance().findAll();

        const list: VehicleEntry[] = [];

        for (const vehicle of vehicles) {
            list.push({
                id: vehicle.id,
                name: vehicle.description,
                isdeleted: vehicle.isdeleted,
                organization_id: vehicle.organization_id,
                in_use: vehicle.in_use
            });
        }

        return {
            statusCode: StatusCodes.OK,
            list
        };
    }

}