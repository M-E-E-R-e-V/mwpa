import {DBRepository} from 'figtree';
import {User} from '../Entities/User.js';

/**
 * User repository
 */
export class UserRepository extends DBRepository<User> {

    /**
     * register name
     */
    public static REGISTER_NAME = 'user';

    /**
     * Retrun a instance
     * @return {UserRepository}
     */
    public static getInstance(): UserRepository {
        return super.getSingleInstance(User);
    }

    /**
     * Get a user by email
     * @param {string} email
     * @param {boolean} disable
     * @return {User | null}
     */
    public async getUserByEMail(email: string, disable: boolean = false): Promise<User | null> {
        return this._repository.findOne({
            where: {
                email: email,
                disable: disable
            }
        });
    }

}