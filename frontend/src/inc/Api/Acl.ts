import {NetFetch} from '../Net/NetFetch';
import {UnauthorizedError} from './Error/UnauthorizedError';
import {StatusCodes} from './Status/StatusCodes';
import {DefaultReturn} from './Types/DefaultReturn';

export type RoleEntry = {
    id: number;
    name: string;
};

export type RoleListResponse = DefaultReturn & {
    list?: RoleEntry[];
};

export type RightEntry = {
    id: number;
    key: string;
};

export type RightListResponse = DefaultReturn & {
    list?: RightEntry[];
};

export type RoleRightEntry = {
    right_id: number;
    hasRight: boolean;
};

export type RoleRightListResponse = DefaultReturn & {
    list?: RoleRightEntry[];
};

export type GroupRolesEntry = {
    group_id: number;
    role_ids: number[];
};

export type GroupRolesListResponse = DefaultReturn & {
    list?: GroupRolesEntry[];
};

const handleStatus = <T extends DefaultReturn>(result: T | null): T | null => {
    if (result?.statusCode === StatusCodes.UNAUTHORIZED) {
        throw new UnauthorizedError();
    }
    if (result?.statusCode === StatusCodes.OK) {
        return result;
    }
    return null;
};

/**
 * Acl admin API — wraps /json/users_roles, /json/users_rights, /json/role_rights
 * and /json/groups_roles. All routes are gated on the backend by
 * RightUsers.users_roles_read (list) or users_roles_write (save).
 */
export class Acl {

    public static async getRoles(): Promise<RoleEntry[]> {
        const result = handleStatus(await NetFetch.postData('/json/users_roles/list', {}) as RoleListResponse);
        return result?.list ?? [];
    }

    public static async saveRoleName(id: number, name: string): Promise<boolean> {
        const result = handleStatus(await NetFetch.postData('/json/users_roles/save', {id, name}) as DefaultReturn);
        return result !== null;
    }

    public static async getRights(): Promise<RightEntry[]> {
        const result = handleStatus(await NetFetch.postData('/json/users_rights/list', {}) as RightListResponse);
        return result?.list ?? [];
    }

    public static async getRoleRights(roleId: number): Promise<RoleRightEntry[]> {
        const result = handleStatus(
            await NetFetch.postData('/json/role_rights/list', {role_id: roleId}) as RoleRightListResponse
        );
        return result?.list ?? [];
    }

    public static async saveRoleRights(roleId: number, list: RoleRightEntry[]): Promise<boolean> {
        const result = handleStatus(
            await NetFetch.postData('/json/role_rights/save', {role_id: roleId, list}) as DefaultReturn
        );
        return result !== null;
    }

    public static async getGroupsRoles(): Promise<GroupRolesEntry[]> {
        const result = handleStatus(await NetFetch.postData('/json/groups_roles/list', {}) as GroupRolesListResponse);
        return result?.list ?? [];
    }

    public static async saveGroupRoles(groupId: number, roleIds: number[]): Promise<boolean> {
        const result = handleStatus(
            await NetFetch.postData('/json/groups_roles/save', {group_id: groupId, role_ids: roleIds}) as DefaultReturn
        );
        return result !== null;
    }

}