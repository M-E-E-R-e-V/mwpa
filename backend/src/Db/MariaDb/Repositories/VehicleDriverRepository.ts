import {DBRepository} from 'figtree';
import {User} from '../Entities/User.js';
import {VehicleDriver} from '../Entities/VehicleDriver.js';

/**
 * Driver row joined with the linked user (full_name).
 */
export type VehicleDriverWithUser = {
    id: number;
    description: string;
    isdeleted: boolean;
    user_id: number;
    user_full_name: string;
};

/**
 * VehicleDriver repository
 */
export class VehicleDriverRepository extends DBRepository<VehicleDriver> {

    /**
     * register name
     */
    public static REGISTER_NAME = 'vehicle_driver';

    /**
     * Retrun a instance
     * @return {VehicleDriverRepository}
     */
    public static getInstance(): VehicleDriverRepository {
        return super.getSingleInstance(VehicleDriver);
    }

    /**
     * Return all drivers joined with their linked user (left join on user_id).
     * @return {VehicleDriverWithUser[]}
     */
    public async findAllWithUser(): Promise<VehicleDriverWithUser[]> {
        const repository = await this._repository;
        const rows = await repository
            .createQueryBuilder('vehicle_driver')
            .leftJoinAndSelect(
                User,
                'user',
                'vehicle_driver.user_id = user.id'
            )
            .getRawMany();

        return rows.map((row) => ({
            id: row.vehicle_driver_id,
            description: row.vehicle_driver_description,
            isdeleted: row.vehicle_driver_isdeleted,
            user_id: row.vehicle_driver_user_id,
            user_full_name: row.user_full_name ?? ''
        }));
    }

}