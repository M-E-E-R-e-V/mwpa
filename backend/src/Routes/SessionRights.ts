import {Role} from 'mwpa_schemas';
import {GroupsRolesRepository} from '../Db/MariaDb/Repositories/GroupsRolesRepository.js';
import {UsersRightsRepository} from '../Db/MariaDb/Repositories/UsersRightsRepository.js';
import {UsersRoleRightsRepository} from '../Db/MariaDb/Repositories/UsersRoleRightsRepository.js';
import {UsersRolesRepository} from '../Db/MariaDb/Repositories/UsersRolesRepository.js';

const _loadRightsForRoles = async(roleIds: number[]): Promise<string[]> => {
    if (roleIds.length === 0) {
        return [];
    }
    const links = await UsersRoleRightsRepository.getInstance().findByRoles(roleIds);
    const rightIds = [...new Set(links.map((l) => l.usersRightId))];
    const rights = await UsersRightsRepository.getInstance().findList(rightIds);
    return rights.map((r) => r.key);
};

/**
 * Resolve the roles + rights a user inherits from their group membership.
 * Path: groups → groups_roles → users_roles → users_role_rights → users_rights.
 *
 * Fallback: when no group has roles assigned yet, isAdmin → Role.root,
 * otherwise Role.user. This keeps existing isAdmin-based prod data working
 * until groups_roles is populated through a (yet-to-be-built) admin UI.
 *
 * Picks the first resolved role for `session.user.role` (rbac-simple supports
 * a single primary role); the union of all rights goes to `rights[]`.
 * @param {number[]} groupIds — every group the user belongs to
 * @param {boolean} isAdmin — legacy isAdmin column, used for fallback role
 * @return {{role: string; rights: string[];}}
 */
export const resolveSessionRolesAndRights = async(
    groupIds: number[],
    isAdmin: boolean
): Promise<{role: string; rights: string[];}> => {
    const groupRoles = await GroupsRolesRepository.getInstance().findByGroups(groupIds);
    const roleIds = [...new Set(groupRoles.map((gr) => gr.usersRoleId))];

    if (roleIds.length === 0) {
        const fallback = isAdmin ? Role.root : Role.user;
        const role = await UsersRolesRepository.getInstance().findByName(fallback);
        if (role) {
            const rights = await _loadRightsForRoles([role.id]);
            return {role: fallback, rights: rights};
        }
        return {role: fallback, rights: []};
    }

    const roles = await UsersRolesRepository.getInstance().findByIds(roleIds);
    const primary = roles[0]?.name ?? '';
    const rights = await _loadRightsForRoles(roleIds);
    return {role: primary, rights: rights};
};