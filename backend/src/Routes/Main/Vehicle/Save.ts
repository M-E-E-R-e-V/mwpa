import {DefaultReturn, StatusCodes} from 'figtree-schemas';
import {Vts} from 'vts';
import {VehicleEntry} from 'mwpa_schemas';
import {Vehicle as VehicleDB} from '../../../Db/MariaDb/Entities/Vehicle.js';
import {VehicleRepository} from '../../../Db/MariaDb/Repositories/VehicleRepository.js';

/**
 * Save
 */
export class Save {

    /**
     * Insert or update a vehicle. id === 0 inserts a new row; non-zero updates.
     * Persists the mutable fields (description, organization_id, in_use,
     * isdeleted). in_use and isdeleted are independent: in_use hides the
     * vehicle from operational pickers; isdeleted hides it from the admin
     * list. See the entity contract for the rationale.
     * Caller must verify admin role.
     * @param {VehicleEntry} entry
     * @return {DefaultReturn}
     */
    public static async saveVehicle(entry?: VehicleEntry): Promise<DefaultReturn> {
        if (Vts.isUndefined(entry)) {
            return {
                statusCode: StatusCodes.INTERNAL_ERROR,
                msg: 'Request incomplete'
            };
        }

        const name = entry.name.trim();

        if (name === '') {
            return {
                statusCode: StatusCodes.INTERNAL_ERROR,
                msg: 'Vehicle name must not be empty'
            };
        }

        let vehicle: VehicleDB|null = null;

        if (entry.id !== 0) {
            vehicle = await VehicleRepository.getInstance().findOne(entry.id);
        }

        if (vehicle === null) {
            vehicle = new VehicleDB();
        }

        vehicle.description = name;
        vehicle.organization_id = entry.organization_id;
        vehicle.in_use = entry.in_use;
        vehicle.isdeleted = entry.isdeleted;

        await VehicleRepository.getInstance().save(vehicle);

        return {
            statusCode: StatusCodes.OK
        };
    }

}