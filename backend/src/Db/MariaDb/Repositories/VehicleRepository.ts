import {DBRepository} from 'figtree';
import {Vehicle} from '../Entities/Vehicle.js';

/**
 * Vehicle repository
 */
export class VehicleRepository extends DBRepository<Vehicle> {

    /**
     * register name
     */
    public static REGISTER_NAME = 'vehicle';

    /**
     * Retrun a instance
     * @return {VehicleRepository}
     */
    public static getInstance(): VehicleRepository {
        return super.getSingleInstance(Vehicle);
    }

}