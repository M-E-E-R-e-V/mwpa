import {StatusCodes} from 'figtree-schemas';
import {VehicleDriverEntry, VehicleDriverListResponse} from 'mwpa_schemas';
import {VehicleDriverRepository} from '../../../Db/MariaDb/Repositories/VehicleDriverRepository.js';

/**
 * List
 */
export class List {

    /**
     * Return all vehicle drivers joined with their linked user (full_name).
     * @return {VehicleDriverListResponse}
     */
    public static async getList(): Promise<VehicleDriverListResponse> {
        const drivers = await VehicleDriverRepository.getInstance().findAllWithUser();

        const list: VehicleDriverEntry[] = [];

        for (const driver of drivers) {
            list.push({
                id: driver.id,
                description: driver.description,
                isdeleted: driver.isdeleted,
                user: {
                    user_id: driver.user_id,
                    name: driver.user_full_name
                }
            });
        }

        return {
            statusCode: StatusCodes.OK,
            list
        };
    }

}