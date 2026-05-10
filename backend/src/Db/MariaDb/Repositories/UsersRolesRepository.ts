import {DBRepository} from 'figtree';
import {In} from 'typeorm';
import {UsersRoles} from '../Entities/UsersRoles.js';

/**
 * Users roles repository
 */
export class UsersRolesRepository extends DBRepository<UsersRoles> {

    /**
     * register name
     */
    public static REGISTER_NAME = 'usersroles';

    /**
     * Return an instance of users roles repository
     * @returns {UsersRolesRepository}
     */
    public static getInstance(): UsersRolesRepository {
        return super.getSingleInstance(UsersRoles);
    }

    public async findByName(name: string): Promise<UsersRoles | null> {
        const repository = await this._repository;
        return repository.findOne({where: {name: name}});
    }

    public async findByIds(ids: number[]): Promise<UsersRoles[]> {
        const repository = await this._repository;
        if (ids.length === 0) {
            return [];
        }
        return repository.find({where: {id: In(ids)}});
    }

}