import {DBRepository} from '@stefanwerfling/figtree';
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

    /**
     * Create a new role with the given name (admin-defined). Returns the saved
     * entity (with its generated id).
     */
    public async create(name: string): Promise<UsersRoles> {
        const repository = await this._repository;
        const entry = repository.create({name: name});
        return repository.save(entry);
    }

    /**
     * Delete a role by id. The caller is responsible for clearing the role's
     * rights + group links first (foreign-key hygiene).
     */
    public async deleteById(id: number): Promise<void> {
        const repository = await this._repository;
        await repository.delete(id);
    }

}