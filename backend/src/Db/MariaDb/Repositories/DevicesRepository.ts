import {DBRepository} from 'figtree';
import {Devices} from '../Entities/Devices.js';

/**
 * Devices repository
 */
export class DevicesRepository extends DBRepository<Devices> {

    /**
     * register name
     */
    public static REGISTER_NAME = 'devices';

    /**
     * Retrun a instance
     * @return {DevicesRepository}
     */
    public static getInstance(): DevicesRepository {
        return super.getSingleInstance(Devices);
    }

    /**
     * Find a device by identity + user (mobile login binding).
     * @param {string} identity
     * @param {number} userId
     * @return {Devices | null}
     */
    public async findByIdentityAndUser(identity: string, userId: number): Promise<Devices | null> {
        const repository = await this._repository;
        return repository.findOne({
            where: {
                identity,
                user_id: userId
            }
        });
    }

    /**
     * Find a device by identity only.
     * @param {string} identity
     * @return {Devices | null}
     */
    public async findByIdentity(identity: string): Promise<Devices | null> {
        const repository = await this._repository;
        return repository.findOne({
            where: {
                identity
            }
        });
    }

}