import {ACLRbac as TACLRbac} from '@stefanwerfling/figtree';
import {
    MwpaRights,
    RightAis,
    RightAnalytics,
    RightApi,
    RightBlacklist,
    RightCatalog,
    RightDevices,
    RightEarthquake,
    RightExport,
    RightExternalTours,
    RightGroups,
    RightMap,
    RightOrganizations,
    RightQuickConnect,
    RightService,
    RightSettings,
    RightSightings,
    RightSpecies,
    RightTours,
    RightUser,
    RightUsers,
    RightVehicles,
    Role
} from 'mwpa_schemas';
import {Rbac} from 'rbac-simple';

/**
 * ACL Rbac
 *
 * The RIGHTS tree is the single source of truth for the right catalog: the
 * SyncRolesRightsSetup flattens it into `users_rights` on every boot, so the
 * admin rights-dialog (RoleRightsEditModal) lists exactly these keys. A parent
 * right (e.g. `species`) implicitly grants all of its children in rbac-simple.
 *
 * ASSOCIATIONS are only the FALLBACK role→rights used when no group has roles
 * assigned yet (isAdmin → root, else user — see resolveSessionRolesAndRights).
 * Once groups_roles is populated, the DB (users_role_rights, UI-authoritative)
 * decides; SyncRolesRightsSetup seeds these defaults only when a role is first
 * created. `root` gets every top-level right; `user` gets the operational
 * read + mobile-capture set so normal users and the mobile app keep working
 * without any admin rights. No master-data read rights: those only open the
 * Admin pages; the working pages get species/vehicle/encounter/organization
 * names from the /json/lookup/* routes (Routes/Main/Lookup.ts).
 */
export class ACLRbac extends TACLRbac<Role, MwpaRights> {

    /**
     * ROLES
     */
    public static ROLES = [
        Role.root,
        Role.user
    ];

    /**
     * RIGHTS — nested catalog. Each top-level key is an area; its children are
     * the per-action rights within that area.
     */
    public static RIGHTS = {
        [RightApi.web]: {},
        [RightApi.mobile]: {},
        [RightService.service]: {
            [RightService.service_status]: {},
            [RightService.service_start]: {},
            [RightService.service_stop]: {},
            [RightService.service_invoke]: {}
        },
        [RightSettings.settings]: {
            [RightSettings.settings_read]: {},
            [RightSettings.settings_write]: {}
        },
        [RightUser.user]: {
            [RightUser.user_read]: {},
            [RightUser.user_write]: {}
        },
        [RightUsers.users]: {
            [RightUsers.users_read]: {},
            [RightUsers.users_write]: {},
            [RightUsers.users_delete]: {},
            [RightUsers.users_roles_read]: {},
            [RightUsers.users_roles_write]: {}
        },
        [RightGroups.groups]: {
            [RightGroups.groups_read]: {},
            [RightGroups.groups_write]: {},
            [RightGroups.groups_delete]: {}
        },
        [RightOrganizations.organizations]: {
            [RightOrganizations.organizations_read]: {},
            [RightOrganizations.organizations_write]: {},
            [RightOrganizations.organizations_delete]: {}
        },
        [RightSightings.sightings]: {
            [RightSightings.sightings_read]: {},
            [RightSightings.sightings_write]: {},
            [RightSightings.sightings_mobile_read]: {},
            [RightSightings.sightings_mobile_write]: {}
        },
        [RightTours.tours]: {
            [RightTours.tours_read]: {},
            [RightTours.tours_write]: {},
            [RightTours.tours_tracking_edit]: {}
        },
        [RightSpecies.species]: {
            [RightSpecies.species_read]: {},
            [RightSpecies.species_write]: {},
            [RightSpecies.species_delete]: {}
        },
        [RightVehicles.vehicles]: {
            [RightVehicles.vehicles_read]: {},
            [RightVehicles.vehicles_write]: {},
            [RightVehicles.vehicles_delete]: {}
        },
        [RightDevices.devices]: {
            [RightDevices.devices_read]: {},
            [RightDevices.devices_write]: {},
            [RightDevices.devices_delete]: {}
        },
        [RightCatalog.catalog]: {
            [RightCatalog.catalog_read]: {},
            [RightCatalog.catalog_write]: {}
        },
        [RightExternalTours.external_tours]: {
            [RightExternalTours.external_tours_read]: {},
            [RightExternalTours.external_tours_write]: {}
        },
        [RightBlacklist.blacklist]: {
            [RightBlacklist.blacklist_read]: {},
            [RightBlacklist.blacklist_write]: {}
        },
        [RightAis.ais]: {
            [RightAis.ais_read]: {}
        },
        [RightEarthquake.earthquake]: {
            [RightEarthquake.earthquake_read]: {}
        },
        [RightMap.map]: {
            [RightMap.map_read]: {}
        },
        [RightAnalytics.analytics]: {
            [RightAnalytics.analytics_read]: {}
        },
        [RightExport.export]: {
            [RightExport.export_xlsx]: {},
            [RightExport.export_aroc]: {},
            [RightExport.export_dwca]: {},
            [RightExport.export_r]: {}
        },
        [RightQuickConnect.quick_connect]: {
            [RightQuickConnect.quick_connect_use]: {}
        }
    };

    /**
     * ASSOCIATIONS — fallback role defaults (see class doc).
     */
    public static ASSOCIATIONS = {
        [Role.root]: [
            RightApi.web,
            RightApi.mobile,
            RightService.service,
            RightSettings.settings,
            RightUser.user,
            RightUsers.users,
            RightGroups.groups,
            RightOrganizations.organizations,
            RightSightings.sightings,
            RightTours.tours,
            RightSpecies.species,
            RightVehicles.vehicles,
            RightDevices.devices,
            RightCatalog.catalog,
            RightExternalTours.external_tours,
            RightBlacklist.blacklist,
            RightAis.ais,
            RightEarthquake.earthquake,
            RightMap.map,
            RightAnalytics.analytics,
            RightExport.export,
            RightQuickConnect.quick_connect
        ],
        [Role.user]: [
            RightApi.web,
            RightApi.mobile,
            RightSightings.sightings_read,
            RightSightings.sightings_mobile_read,
            RightSightings.sightings_mobile_write,
            RightTours.tours_read,
            RightTours.tours_tracking_edit,
            RightMap.map,
            RightAnalytics.analytics,
            RightExternalTours.external_tours_read,
            RightAis.ais_read,
            RightEarthquake.earthquake_read,
            RightExport.export,
            RightUser.user,
            RightQuickConnect.quick_connect_use
        ]
    };

    /**
     * Expand a granted right-key list into the effective leaf set, mirroring
     * rbac-simple's "a parent right implicitly grants its children" rule. For
     * every granted area key, all of its child action keys are added. Lets the
     * frontend decide menu/page visibility with a plain `includes()` check that
     * matches what `checkAccess` would allow on the backend.
     * @param {string[]} keys — granted right keys (from session.user.rights)
     * @return {string[]} granted keys plus every implied child key
     */
    public static expandRights(keys: string[]): string[] {
        const result = new Set<string>(keys);
        const rights = ACLRbac.RIGHTS as Record<string, Record<string, unknown>>;

        for (const key of keys) {
            const children = rights[key];
            if (children) {
                for (const child of Object.keys(children)) {
                    result.add(child);
                }
            }
        }

        return [...result];
    }

    /**
     * Grant access when the request's right is covered by the session's
     * explicit right list (UI-assigned, resolved from users_role_rights into
     * `session.user.rights`), OR by the static role→ASSOCIATIONS fallback.
     *
     * figtree's base `ACLRbac.checkAccess` ignores the userRightList and asks
     * rbac-simple, which only knows the two seeded roles (root/user) via
     * ASSOCIATIONS — so without this override a group mapped to a *custom* role
     * would be denied every gated route, and per-role rights edited in the
     * admin dialog would never take effect. Honoring the list here makes the
     * dialog authoritative while keeping the root/user defaults working.
     *
     * Additive by design: it can only ever grant (never revoke) relative to the
     * ASSOCIATIONS fallback, so no logged-in user loses access they have today.
     * The list is parent-expanded the same way the frontend expands it, so the
     * client-side menu/page gating and the server-side check agree.
     * @param {string} role — session role name
     * @param {string} right — the route's required right
     * @param {string[]} [userRightList] — session.user.rights
     * @return {Promise<boolean>}
     */
    public override async checkAccess(role: string, right: string, userRightList?: string[]): Promise<boolean> {
        if (userRightList !== undefined && ACLRbac.expandRights(userRightList).includes(right)) {
            return true;
        }

        return super.checkAccess(role, right, userRightList);
    }

    /**
     * Constructor
     */
    public constructor() {
        super();

        this._rbac = new Rbac<Role, MwpaRights>(
            ACLRbac.ROLES,
            ACLRbac.RIGHTS,
            ACLRbac.ASSOCIATIONS
        );
    }

}