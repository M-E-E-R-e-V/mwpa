import {DefaultReturn, StatusCodes} from 'figtree-schemas';
import {Vts} from 'vts';
import {VehicleDeleteRequest} from 'mwpa_schemas';
import {VehicleRepository} from '../../../Db/MariaDb/Repositories/VehicleRepository.js';

/**
 * Delete
 */
export class Delete {

    /**
     * Soft-delete a vehicle (sets isdeleted=true). Hard delete would orphan
     * historical sightings that still reference the vehicle_id — the in_use
     * flag is the correct knob for hiding active boats from operational
     * pickers without touching the audit trail.
     * Caller must verify admin role.
     * @param {VehicleDeleteRequest} request
     * @return {DefaultReturn}
     */
    public static async deleteVehicle(request?: VehicleDeleteRequest): Promise<DefaultReturn> {
        if (Vts.isUndefined(request)) {
            return {
                statusCode: StatusCodes.INTERNAL_ERROR,
                msg: 'Request incomplete'
            };
        }

        const vehicle = await VehicleRepository.getInstance().findOne(request.id);

        if (!vehicle) {
            return {
                statusCode: StatusCodes.INTERNAL_ERROR,
                msg: 'Vehicle not found in the database'
            };
        }

        vehicle.isdeleted = true;
        vehicle.in_use = false;
        await VehicleRepository.getInstance().save(vehicle);

        return {
            statusCode: StatusCodes.OK
        };
    }

}