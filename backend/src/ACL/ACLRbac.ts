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
 * without any admin rights.
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
            [RightExport.export_read]: {}
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
            RightSpecies.species_read,
            RightCatalog.catalog_read,
            RightMap.map,
            RightAnalytics.analytics,
            RightExternalTours.external_tours_read,
            RightAis.ais_read,
            RightEarthquake.earthquake_read,
            RightExport.export_read,
            RightUser.user,
            RightQuickConnect.quick_connect_use
        ]
    };

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