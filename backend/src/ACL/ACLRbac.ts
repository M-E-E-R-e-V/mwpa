import {ACLRbac as TACLRbac} from 'figtree';
import {MwpaRights, RightService, Role} from 'mwpa_schemas';
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

    };

    /**
     * ASSOCIATIONS
     */
    public static ASSOCIATIONS = {
        [Role.root]: [
            RightService.service,
        ],
        [Role.user]: []
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