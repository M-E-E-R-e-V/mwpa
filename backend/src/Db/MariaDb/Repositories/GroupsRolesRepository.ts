import {DBRepositoryBase} from 'figtree';
import {In} from 'typeorm';
import {GroupsRoles} from '../Entities/GroupsRoles.js';

/**
 * Group-roles repository (M:N join between groups and users_roles).
 */
export class GroupsRolesRepository extends DBRepositoryBase<GroupsRoles> {

    /**
     * register name
     */
    public static REGISTER_NAME = 'groupsroles';

    /**
     * Return an instance of group-roles repository.
     * @returns {GroupsRolesRepository}
     */
    public static getInstance(): GroupsRolesRepository {
        return super.getSingleInstance(GroupsRoles);
    }

    public async findByGroups(groupIds: number[]): Promise<GroupsRoles[]> {
        const repository = await this._repository;
        if (groupIds.length === 0) {
            return [];
        }
        return repository.find({
            where: {groupId: In(groupIds)}
        });
    }

    public async findAll(): Promise<GroupsRoles[]> {
        const repository = await this._repository;
        return repository.find();
    }

    /**
     * Replace the role set of a group: delete all existing assignments for this
     * group, then insert the new ones.
     */
    public async replaceForGroup(groupId: number, roleIds: number[]): Promise<void> {
        const repository = await this._repository;
        await repository.delete({groupId: groupId});
        if (roleIds.length === 0) {
            return;
        }
        await repository.upsert(
            roleIds.map((roleId) => ({groupId: groupId, usersRoleId: roleId})),
            ['groupId', 'usersRoleId']
        );
    }

}