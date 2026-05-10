import {DBRepositoryBase} from 'figtree';
import {In} from 'typeorm';
import {UsersRoleRights} from '../Entities/UsersRoleRights.js';

/**
 * Users role-rights repository (M:N join between users_roles and users_rights).
 */
export class UsersRoleRightsRepository extends DBRepositoryBase<UsersRoleRights> {

    /**
     * register name
     */
    public static REGISTER_NAME = 'usersrolerights';

    /**
     * Return an instance of role-rights repository.
     * @returns {UsersRoleRightsRepository}
     */
    public static getInstance(): UsersRoleRightsRepository {
        return super.getSingleInstance(UsersRoleRights);
    }

    public async findByRoles(roleIds: number[]): Promise<UsersRoleRights[]> {
        const repository = await this._repository;
        if (roleIds.length === 0) {
            return [];
        }
        return repository.find({
            where: {usersRoleId: In(roleIds)}
        });
    }

    public async exists(roleId: number, rightId: number): Promise<boolean> {
        const repository = await this._repository;
        return await repository.findOne({
            where: {usersRoleId: roleId, usersRightId: rightId}
        }) !== null;
    }

    public async assign(roleId: number, rightId: number): Promise<void> {
        const repository = await this._repository;
        await repository.upsert(
            {usersRoleId: roleId, usersRightId: rightId},
            ['usersRoleId', 'usersRightId']
        );
    }

    /**
     * Replace the right set of a role: delete all existing role→right rows and
     * insert the new ones. Used by the admin UI when an admin saves a role's
     * rights checkbox grid.
     */
    public async replaceForRole(roleId: number, rightIds: number[]): Promise<void> {
        const repository = await this._repository;
        await repository.delete({usersRoleId: roleId});
        if (rightIds.length === 0) {
            return;
        }
        await repository.upsert(
            rightIds.map((rightId) => ({usersRoleId: roleId, usersRightId: rightId})),
            ['usersRoleId', 'usersRightId']
        );
    }

}