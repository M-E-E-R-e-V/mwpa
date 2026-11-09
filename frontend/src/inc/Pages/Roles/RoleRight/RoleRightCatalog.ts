/**
 * One right inside an area: the right key plus a short label and a hint that
 * says WHERE the right takes effect (menu entry / page / app).
 */
export type RoleRightActionDef = {
    key: string;
    label: string;
    hint: string;
};

/**
 * One area of the rights tree (= a top-level key in backend ACLRbac.RIGHTS).
 * `key` is the area right itself, which grants every action of the area in
 * rbac-simple; areas without actions (web, mobile) are a single checkbox.
 */
export type RoleRightAreaDef = {
    key: string;
    label: string;
    icon: string;
    hint?: string;
    actions: RoleRightActionDef[];
};

/**
 * A section groups areas by where they show up for the user.
 */
export type RoleRightSectionDef = {
    id: string;
    label: string;
    icon: string;
    hint: string;
    areas: RoleRightAreaDef[];
};

/**
 * Display catalog for the role-rights dialog. Mirrors backend
 * `ACLRbac.RIGHTS` (same keys) and documents which menu entry / page each
 * right unlocks, so the admin can see what belongs to the admin area. Keys
 * the backend sends that are not listed here are shown in an "Other" section,
 * so a newly added backend right never silently disappears from the dialog.
 *
 * All labels/hints are English source strings translated via Lang.
 */
export class RoleRightCatalog {

    /**
     * Section id for rights not described in the catalog.
     */
    public static readonly SECTION_OTHER = 'other';

    /**
     * Sections in display order.
     */
    public static readonly SECTIONS: RoleRightSectionDef[] = [
        {
            id: 'access',
            label: 'Basic access',
            icon: 'fas fa-sign-in-alt',
            hint: 'Login and own profile.',
            areas: [
                {
                    key: 'web',
                    label: 'Web interface',
                    icon: 'fas fa-desktop',
                    hint: 'Sign in to this web interface.',
                    actions: []
                },
                {
                    key: 'mobile',
                    label: 'Mobile app',
                    icon: 'fas fa-mobile-alt',
                    hint: 'Sign in with the MWPA mobile app.',
                    actions: []
                },
                {
                    key: 'user',
                    label: 'Own profile',
                    icon: 'fas fa-id-card',
                    actions: [
                        {key: 'user_read', label: 'Read', hint: 'View own profile and saved table filters.'},
                        {key: 'user_write', label: 'Write', hint: 'Change own password / PIN, save table filters.'}
                    ]
                },
                {
                    key: 'quick_connect',
                    label: 'Quick Connect',
                    icon: 'fas fa-qrcode',
                    actions: [
                        {key: 'quick_connect_use', label: 'Use', hint: 'Show the QR code to sign in the mobile app.'}
                    ]
                }
            ]
        },
        {
            id: 'work',
            label: 'Working area',
            icon: 'fas fa-binoculars',
            hint: 'Pages in the main menu (outside of Admin) and the mobile app.',
            areas: [
                {
                    key: 'sightings',
                    label: 'Sightings',
                    icon: 'fas fa-binoculars',
                    actions: [
                        {key: 'sightings_read', label: 'Read', hint: 'Menu: Sighting, Ocean & Fishing (incl. species, vehicle and encounter names).'},
                        {key: 'sightings_write', label: 'Write', hint: 'Edit and delete sightings.'},
                        {key: 'sightings_mobile_read', label: 'App: read', hint: 'Load sightings in the mobile app.'},
                        {key: 'sightings_mobile_write', label: 'App: write', hint: 'Record sightings with the mobile app.'}
                    ]
                },
                {
                    key: 'tours',
                    label: 'Tours',
                    icon: 'fas fa-flag',
                    actions: [
                        {key: 'tours_read', label: 'Read', hint: 'Menu: Tours → Tour list.'},
                        {key: 'tours_write', label: 'Write', hint: 'Menu: Tours → Orphan Tracks (assign tracks).'},
                        {key: 'tours_tracking_edit', label: 'Edit tracks', hint: 'Move and delete GPS track points (web and app).'}
                    ]
                },
                {
                    key: 'external_tours',
                    label: 'External tours',
                    icon: 'fas fa-calendar-alt',
                    actions: [
                        {key: 'external_tours_read', label: 'Read', hint: 'Menu: Tours → Tours External.'},
                        {key: 'external_tours_write', label: 'Write', hint: 'Admin → External Tour Sources: manage.'}
                    ]
                },
                {
                    key: 'analytics',
                    label: 'Analytics',
                    icon: 'fas fa-chart-line',
                    actions: [
                        {key: 'analytics_read', label: 'Read', hint: 'Menu: Species comparison, species profiles, movement analyses.'}
                    ]
                },
                {
                    key: 'ais',
                    label: 'AIS',
                    icon: 'fas fa-ship',
                    actions: [
                        {key: 'ais_read', label: 'Read', hint: 'Menu: Live AIS Map.'}
                    ]
                },
                {
                    key: 'earthquake',
                    label: 'Earthquakes',
                    icon: 'fas fa-bolt',
                    actions: [
                        {key: 'earthquake_read', label: 'Read', hint: 'Menu: Earthquakes.'}
                    ]
                },
                {
                    key: 'map',
                    label: 'Map',
                    icon: 'fas fa-map',
                    actions: [
                        {key: 'map_read', label: 'Read', hint: 'Reserved, currently without effect.'}
                    ]
                },
                {
                    key: 'export',
                    label: 'Export',
                    icon: 'fas fa-file-export',
                    actions: [
                        {key: 'export_xlsx', label: 'Excel', hint: 'Export sightings as Excel file.'},
                        {key: 'export_aroc', label: 'AROC', hint: 'Authority report (AROC template).'},
                        {key: 'export_dwca', label: 'Darwin Core', hint: 'Darwin Core Archive (GBIF/OBIS).'},
                        {key: 'export_r', label: 'R', hint: 'Sighting export for R.'}
                    ]
                }
            ]
        },
        {
            id: 'master',
            label: 'Master data',
            icon: 'fas fa-database',
            hint: 'Only for the Admin pages. Sightings, tours and analyses show the names without these rights.',
            areas: [
                {
                    key: 'species',
                    label: 'Species',
                    icon: 'fas fa-paw',
                    actions: [
                        {key: 'species_read', label: 'Read', hint: 'Admin → Species: view.'},
                        {key: 'species_write', label: 'Write', hint: 'Admin → Species: create, edit, merge.'},
                        {key: 'species_delete', label: 'Delete', hint: 'Admin → Species: delete.'}
                    ]
                },
                {
                    key: 'vehicles',
                    label: 'Vehicles & drivers',
                    icon: 'fas fa-ship',
                    actions: [
                        {key: 'vehicles_read', label: 'Read', hint: 'Admin → Vehicle: view.'},
                        {key: 'vehicles_write', label: 'Write', hint: 'Admin → Vehicle: create and edit.'},
                        {key: 'vehicles_delete', label: 'Delete', hint: 'Admin → Vehicle: delete.'}
                    ]
                },
                {
                    key: 'catalog',
                    label: 'Encounters & behaviour',
                    icon: 'fas fa-satellite-dish',
                    actions: [
                        {key: 'catalog_read', label: 'Read', hint: 'Admin → Encounters: view.'},
                        {key: 'catalog_write', label: 'Write', hint: 'Admin → Encounters: manage.'}
                    ]
                },
                {
                    key: 'organizations',
                    label: 'Organizations',
                    icon: 'fas fa-globe',
                    actions: [
                        {key: 'organizations_read', label: 'Read', hint: 'Admin → Organization: view.'},
                        {key: 'organizations_write', label: 'Write', hint: 'Admin → Organization: manage, incl. tracking areas.'},
                        {key: 'organizations_delete', label: 'Delete', hint: 'Admin → Organization: delete.'}
                    ]
                }
            ]
        },
        {
            id: 'admin',
            label: 'Administration',
            icon: 'fas fa-cogs',
            hint: 'Pages in the Admin menu. Only for administrators.',
            areas: [
                {
                    key: 'users',
                    label: 'Users & roles',
                    icon: 'fas fa-users',
                    actions: [
                        {key: 'users_read', label: 'Read', hint: 'Admin → Users: view.'},
                        {key: 'users_write', label: 'Write', hint: 'Admin → Users: create and edit.'},
                        {key: 'users_delete', label: 'Delete', hint: 'Admin → Users: delete.'},
                        {key: 'users_roles_read', label: 'Roles: read', hint: 'Admin → Roles: view.'},
                        {key: 'users_roles_write', label: 'Roles: write', hint: 'Admin → Roles: edit rights, assign roles to groups.'}
                    ]
                },
                {
                    key: 'groups',
                    label: 'User groups',
                    icon: 'fas fa-tags',
                    actions: [
                        {key: 'groups_read', label: 'Read', hint: 'Admin → User Groups: view.'},
                        {key: 'groups_write', label: 'Write', hint: 'Admin → User Groups: create and edit.'},
                        {key: 'groups_delete', label: 'Delete', hint: 'Admin → User Groups: delete.'}
                    ]
                },
                {
                    key: 'devices',
                    label: 'Devices',
                    icon: 'fas fa-server',
                    actions: [
                        {key: 'devices_read', label: 'Read', hint: 'Admin → Devices: view.'},
                        {key: 'devices_write', label: 'Write', hint: 'Admin → Devices: edit.'},
                        {key: 'devices_delete', label: 'Delete', hint: 'Admin → Devices: delete.'}
                    ]
                },
                {
                    key: 'blacklist',
                    label: 'Blacklist',
                    icon: 'fas fa-ban',
                    actions: [
                        {key: 'blacklist_read', label: 'Read', hint: 'Admin → Blacklist: view blocked IPs.'},
                        {key: 'blacklist_write', label: 'Write', hint: 'Admin → Blacklist: block and unblock IPs.'}
                    ]
                },
                {
                    key: 'service',
                    label: 'Services',
                    icon: 'fas fa-cog',
                    actions: [
                        {key: 'service_status', label: 'Status', hint: 'Admin → Services: view status.'},
                        {key: 'service_start', label: 'Start', hint: 'Admin → Services: start a service.'},
                        {key: 'service_stop', label: 'Stop', hint: 'Admin → Services: stop a service.'},
                        {key: 'service_invoke', label: 'Invoke now', hint: 'Admin → Services: run a service now.'}
                    ]
                },
                {
                    key: 'settings',
                    label: 'Settings',
                    icon: 'fas fa-sliders-h',
                    actions: [
                        {key: 'settings_read', label: 'Read', hint: 'Read system settings.'},
                        {key: 'settings_write', label: 'Write', hint: 'Change system settings (e.g. movement calculation).'}
                    ]
                }
            ]
        }
    ];

    /**
     * Return the area definition whose key or one of whose actions matches.
     * @param {string} key
     * @return {RoleRightAreaDef|null}
     */
    public static findArea(key: string): RoleRightAreaDef | null {
        for (const section of RoleRightCatalog.SECTIONS) {
            for (const area of section.areas) {
                if (area.key === key || area.actions.some((action) => action.key === key)) {
                    return area;
                }
            }
        }

        return null;
    }

    /**
     * Every right key the catalog describes (areas + actions).
     * @return {Set<string>}
     */
    public static getKnownKeys(): Set<string> {
        const keys = new Set<string>();

        for (const section of RoleRightCatalog.SECTIONS) {
            for (const area of section.areas) {
                keys.add(area.key);

                for (const action of area.actions) {
                    keys.add(action.key);
                }
            }
        }

        return keys;
    }

}