import {DBSetupHook, Logger} from 'figtree';
import {ACLRbac} from '../../../ACL/ACLRbac.js';
import {GroupsRolesRepository} from '../Repositories/GroupsRolesRepository.js';
import {UsersRightsRepository} from '../Repositories/UsersRightsRepository.js';
import {UsersRoleRightsRepository} from '../Repositories/UsersRoleRightsRepository.js';
import {UsersRolesRepository} from '../Repositories/UsersRolesRepository.js';
import {UsersRights} from '../Entities/UsersRights.js';
import {UsersRoles} from '../Entities/UsersRoles.js';

/**
 * Seed users_rights, users_roles and users_role_rights from the ACLRbac
 * constants. Runs on every boot ('always') so the catalog stays in sync with
 * code-side changes. groups_roles is left alone — those are user-managed.
 */
export class SyncRolesRightsSetup implements DBSetupHook {

    public readonly id = 'a1d3c0e8-mwpa-sync-roles-rights';

    public readonly mode: 'always' = 'always';

    /**
     * Walk the nested rights tree from ACLRbac.RIGHTS and return every key.
     */
    private _flattenRights(tree: Record<string, unknown>): string[] {
        const out: string[] = [];
        for (const [key, sub] of Object.entries(tree)) {
            out.push(key);
            if (sub && typeof sub === 'object' && Object.keys(sub as object).length > 0) {
                out.push(...this._flattenRights(sub as Record<string, unknown>));
            }
        }
        return out;
    }

    private async _ensureRight(key: string, log: ReturnType<typeof Logger.getLogger>): Promise<UsersRights> {
        const repo = UsersRightsRepository.getInstance();
        const found = await repo.findByKey(key);
        if (found) {
            return found;
        }
        const entry = new UsersRights();
        entry.key = key;
        await repo.save(entry);
        log?.silly(`SyncRolesRightsSetup: created right '${key}'`);
        return entry;
    }

    /**
     * Ensure a role exists. Returns {role, created}; `created=true` means we
     * just inserted it, so the caller seeds default rights for it; `false`
     * means it was already there and the admin may have customised the rights —
     * we leave them alone (kavula-style: UI is authoritative for role-rights).
     */
    private async _ensureRole(name: string, log: ReturnType<typeof Logger.getLogger>): Promise<{role: UsersRoles; created: boolean;}> {
        const repo = UsersRolesRepository.getInstance();
        const found = await repo.findByName(name);
        if (found) {
            return {role: found, created: false};
        }
        const entry = new UsersRoles();
        entry.name = name;
        await repo.save(entry);
        log?.silly(`SyncRolesRightsSetup: created role '${name}'`);
        return {role: entry, created: true};
    }

    private async _ensureAssoc(roleId: number, rightId: number): Promise<void> {
        const repo = UsersRoleRightsRepository.getInstance();
        if (!await repo.exists(roleId, rightId)) {
            await repo.assign(roleId, rightId);
        }
    }

    public async run(): Promise<void> {
        const log = Logger.getLogger();

        // 1. rights catalog (parallel — independent rows)
        const rightKeys = this._flattenRights(ACLRbac.RIGHTS as Record<string, unknown>);
        const rightEntries = await Promise.all(rightKeys.map((k) => this._ensureRight(k, log)));
        const rightsByKey = new Map(rightEntries.map((r) => [r.key, r]));

        // 2. roles catalog — track which were just created so we only seed default rights for those
        const roleEntries = await Promise.all(ACLRbac.ROLES.map((r) => this._ensureRole(r, log)));
        const rolesByName = new Map(roleEntries.map(({role, created}) => [role.name, {role: role, created: created}]));

        /*
         * 3. role-right associations.
         * Only seed for roles that were JUST created in this run. For pre-existing
         * roles, role-rights are UI-managed and we must not re-add anything the
         * admin has removed (kavula-style).
         */
        const assocs: {roleId: number; rightId: number;}[] = [];
        for (const [roleName, rightList] of Object.entries(ACLRbac.ASSOCIATIONS)) {
            const entry = rolesByName.get(roleName);
            if (!entry || !entry.created) {
                continue;
            }
            for (const rightKey of rightList as string[]) {
                const right = rightsByKey.get(rightKey);
                if (right) {
                    assocs.push({roleId: entry.role.id, rightId: right.id});
                }
            }
        }
        await Promise.all(assocs.map(({roleId, rightId}) => this._ensureAssoc(roleId, rightId)));

        /*
         * groups_roles is intentionally left alone — admins manage that via UI.
         * Touch the repo so it's eagerly loaded (fail fast if the table is missing).
         */
        await GroupsRolesRepository.getInstance().findByGroups([]);
    }

}