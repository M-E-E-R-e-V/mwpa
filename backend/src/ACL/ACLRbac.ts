import {ACLRbac as TACLRbac} from 'figtree';
import {MwpaRights, RightService, RightSightings, RightUsers, Role} from 'mwpa_schemas';
import {Rbac} from 'rbac-simple';

/**
 * ACL Rbac
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
     * RIGHTS
     */
    public static RIGHTS = {
        [RightService.service]: {
            [RightService.service_status]: {},
            [RightService.service_start]: {},
            [RightService.service_stop]: {},
            [RightService.service_invoke]: {}
        },
        [RightSightings.sightings]: {
            [RightSightings.sightings_read]: {},
            [RightSightings.sightings_write]: {},
            [RightSightings.sightings_mobile_read]: {},
            [RightSightings.sightings_mobile_write]: {}
        },
        [RightUsers.users]: {
            [RightUsers.users_read]: {},
            [RightUsers.users_write]: {},
            [RightUsers.users_delete]: {},
            [RightUsers.users_roles_read]: {},
            [RightUsers.users_roles_write]: {}
        },
    };

    /**
     * ASSOCIATIONS
     */
    public static ASSOCIATIONS = {
        [Role.root]: [
            RightService.service,
            RightSightings.sightings,
            RightUsers.users
        ],
        [Role.user]: [
            RightSightings.sightings_read
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