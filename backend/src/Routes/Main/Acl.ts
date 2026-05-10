import {Router} from 'express';
import {DefaultRoute} from 'figtree';
import {DefaultReturn, SchemaDefaultReturn, StatusCodes} from 'figtree-schemas';
import {Vts} from 'vts';
import {
    GroupsRolesEntry,
    GroupsRolesListResponse,
    GroupsRolesSaveRequest,
    RightUsers,
    RoleRightEntry,
    RoleRightsListResponse,
    RoleRightsRequest,
    RoleRightsSaveRequest,
    SchemaGroupsRolesListResponse,
    SchemaGroupsRolesSaveRequest,
    SchemaMWPASessionData,
    SchemaRoleRightsListResponse,
    SchemaRoleRightsRequest,
    SchemaRoleRightsSaveRequest,
    SchemaUsersRightsListResponse,
    SchemaUsersRoleSaveRequest,
    SchemaUsersRolesListResponse,
    UsersRightsListResponse,
    UsersRoleSaveRequest,
    UsersRolesListResponse
} from 'mwpa_schemas';
import {GroupsRolesRepository} from '../../Db/MariaDb/Repositories/GroupsRolesRepository.js';
import {UsersRightsRepository} from '../../Db/MariaDb/Repositories/UsersRightsRepository.js';
import {UsersRoleRightsRepository} from '../../Db/MariaDb/Repositories/UsersRoleRightsRepository.js';
import {UsersRolesRepository} from '../../Db/MariaDb/Repositories/UsersRolesRepository.js';
import {checkMWPAUserIsLoginACL} from '../AuthCheck.js';
import {defaultMWPASessionInit} from '../SessionDefault.js';

/**
 * Acl administration routes — list/edit roles, list rights, edit role-rights,
 * edit group-roles. Read endpoints require RightUsers.users_roles_read; write
 * endpoints require RightUsers.users_roles_write.
 */
export class Acl extends DefaultRoute {

    public getExpressRouter(): Router {

        // roles list ------------------------------------------------------------------------------
        this._post(
            '/json/users_roles/list',
            checkMWPAUserIsLoginACL,
            async(): Promise<UsersRolesListResponse> => {
                const repo = await UsersRolesRepository.getInstance().getRepository();
                const rows = await repo.find({order: {name: 'ASC'}});
                return {
                    statusCode: StatusCodes.OK,
                    list: rows.map((r) => ({id: r.id, name: r.name}))
                };
            },
            {
                description: 'List of all roles.',
                aclRight: RightUsers.users_roles_read,
                responseBodySchema: SchemaUsersRolesListResponse,
                sessionSchema: SchemaMWPASessionData,
                sessionInit: defaultMWPASessionInit
            }
        );

        // role rename -----------------------------------------------------------------------------
        this._post(
            '/json/users_roles/save',
            checkMWPAUserIsLoginACL,
            async(_req, _res, data): Promise<DefaultReturn> => {
                const body = data.body as UsersRoleSaveRequest;
                if (Vts.isUndefined(body)) {
                    return {statusCode: StatusCodes.INTERNAL_ERROR, msg: 'Request incomplete'};
                }
                const trimmed = body.name.trim();
                if (trimmed === '') {
                    return {statusCode: StatusCodes.INTERNAL_ERROR, msg: 'Role name cannot be empty.'};
                }
                const role = await UsersRolesRepository.getInstance().findOne(body.id);
                if (!role) {
                    return {statusCode: StatusCodes.INTERNAL_ERROR, msg: 'Role not found.'};
                }
                role.name = trimmed;
                await UsersRolesRepository.getInstance().save(role);
                return {statusCode: StatusCodes.OK};
            },
            {
                description: 'Rename a role.',
                aclRight: RightUsers.users_roles_write,
                bodySchema: SchemaUsersRoleSaveRequest,
                responseBodySchema: SchemaDefaultReturn,
                sessionSchema: SchemaMWPASessionData,
                sessionInit: defaultMWPASessionInit
            }
        );

        // rights list -----------------------------------------------------------------------------
        this._post(
            '/json/users_rights/list',
            checkMWPAUserIsLoginACL,
            async(): Promise<UsersRightsListResponse> => {
                const repo = await UsersRightsRepository.getInstance().getRepository();
                const rows = await repo.find({order: {key: 'ASC'}});
                return {
                    statusCode: StatusCodes.OK,
                    list: rows.map((r) => ({id: r.id, key: r.key}))
                };
            },
            {
                description: 'List of all known right keys.',
                aclRight: RightUsers.users_roles_read,
                responseBodySchema: SchemaUsersRightsListResponse,
                sessionSchema: SchemaMWPASessionData,
                sessionInit: defaultMWPASessionInit
            }
        );

        // role-rights list ------------------------------------------------------------------------
        this._post(
            '/json/role_rights/list',
            checkMWPAUserIsLoginACL,
            async(_req, _res, data): Promise<RoleRightsListResponse> => {
                const body = data.body as RoleRightsRequest;
                if (Vts.isUndefined(body)) {
                    return {statusCode: StatusCodes.INTERNAL_ERROR, msg: 'Request incomplete'};
                }

                const allRightsRepo = await UsersRightsRepository.getInstance().getRepository();
                const allRights = await allRightsRepo.find();
                const links = await UsersRoleRightsRepository.getInstance().findByRoles([body.role_id]);
                const granted = new Set(links.map((l) => l.usersRightId));

                const list: RoleRightEntry[] = allRights.map((r) => ({
                    right_id: r.id,
                    hasRight: granted.has(r.id)
                }));

                return {statusCode: StatusCodes.OK, list: list};
            },
            {
                description: 'For a given role, return every right with hasRight=true|false.',
                aclRight: RightUsers.users_roles_read,
                bodySchema: SchemaRoleRightsRequest,
                responseBodySchema: SchemaRoleRightsListResponse,
                sessionSchema: SchemaMWPASessionData,
                sessionInit: defaultMWPASessionInit
            }
        );

        // role-rights save ------------------------------------------------------------------------
        this._post(
            '/json/role_rights/save',
            checkMWPAUserIsLoginACL,
            async(_req, _res, data): Promise<DefaultReturn> => {
                const body = data.body as RoleRightsSaveRequest;
                if (Vts.isUndefined(body)) {
                    return {statusCode: StatusCodes.INTERNAL_ERROR, msg: 'Request incomplete'};
                }
                const role = await UsersRolesRepository.getInstance().findOne(body.role_id);
                if (!role) {
                    return {statusCode: StatusCodes.INTERNAL_ERROR, msg: 'Role not found.'};
                }
                const grantedIds = body.list.filter((e) => e.hasRight).map((e) => e.right_id);
                await UsersRoleRightsRepository.getInstance().replaceForRole(body.role_id, grantedIds);
                return {statusCode: StatusCodes.OK};
            },
            {
                description: 'Replace the right set of a role.',
                aclRight: RightUsers.users_roles_write,
                bodySchema: SchemaRoleRightsSaveRequest,
                responseBodySchema: SchemaDefaultReturn,
                sessionSchema: SchemaMWPASessionData,
                sessionInit: defaultMWPASessionInit
            }
        );

        // groups-roles list -----------------------------------------------------------------------
        this._post(
            '/json/groups_roles/list',
            checkMWPAUserIsLoginACL,
            async(): Promise<GroupsRolesListResponse> => {
                const all = await GroupsRolesRepository.getInstance().findAll();
                const byGroup = new Map<number, number[]>();
                for (const link of all) {
                    const arr = byGroup.get(link.groupId);
                    if (arr) {
                        arr.push(link.usersRoleId);
                    } else {
                        byGroup.set(link.groupId, [link.usersRoleId]);
                    }
                }
                const list: GroupsRolesEntry[] = [];
                for (const [groupId, roleIds] of byGroup) {
                    list.push({group_id: groupId, role_ids: roleIds});
                }
                return {statusCode: StatusCodes.OK, list: list};
            },
            {
                description: 'List of all group → role assignments.',
                aclRight: RightUsers.users_roles_read,
                responseBodySchema: SchemaGroupsRolesListResponse,
                sessionSchema: SchemaMWPASessionData,
                sessionInit: defaultMWPASessionInit
            }
        );

        // groups-roles save -----------------------------------------------------------------------
        this._post(
            '/json/groups_roles/save',
            checkMWPAUserIsLoginACL,
            async(_req, _res, data): Promise<DefaultReturn> => {
                const body = data.body as GroupsRolesSaveRequest;
                if (Vts.isUndefined(body)) {
                    return {statusCode: StatusCodes.INTERNAL_ERROR, msg: 'Request incomplete'};
                }
                if (body.group_id <= 0) {
                    return {statusCode: StatusCodes.INTERNAL_ERROR, msg: 'group_id is required.'};
                }
                await GroupsRolesRepository.getInstance().replaceForGroup(body.group_id, body.role_ids);
                return {statusCode: StatusCodes.OK};
            },
            {
                description: 'Replace the role set of a group.',
                aclRight: RightUsers.users_roles_write,
                bodySchema: SchemaGroupsRolesSaveRequest,
                responseBodySchema: SchemaDefaultReturn,
                sessionSchema: SchemaMWPASessionData,
                sessionInit: defaultMWPASessionInit
            }
        );

        return super.getExpressRouter();
    }

}