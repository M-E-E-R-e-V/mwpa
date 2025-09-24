import {DBRepository} from 'figtree';
import {UserGroups} from '../Entities/UserGroups.js';

/**
 * User groups repository
 */
export class UserGroupsRepository extends DBRepository<UserGroups> {

    /**
     * register name
     */
    public static REGISTER_NAME = 'user_groups';

    /**
     * Retrun a instance
     * @return {UserGroupsRepository}
     */
    public static getInstance(): UserGroupsRepository {
        return super.getSingleInstance(UserGroups);
    }

    /**
     * Find all by user id
     * @param {number} userId
     * @return {UserGroups[]}
     */
    public async findAllBy(userId: number): Promise<UserGroups[]> {
        return this._repository.find({
            where: {
                user_id: userId
            }
        });
    }

}