import {ACLRbac as TACLRbac} from 'figtree';
import {Rbac} from 'rbac-simple';

/**
 * Role
 */
export const enum Role {
    root = 'root',
    user = 'user'
}

/**
 * Right
 */
export const enum Right {
    backend = 'backend',
    frontend = 'frontend',
    mobile = 'mobile',
    service = 'service',
    service_status = 'service_status',
    service_start = 'service_start',
    service_stop = 'service_stop',
}

/**
 * ACL Rbac
 */
export class ACLRbac extends TACLRbac<Role, Right> {

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
        [Right.backend]: {
            [Right.service]: {
                [Right.service_status]: {},
                [Right.service_start]: {},
                [Right.service_stop]: {}
            },
        },
        [Right.frontend]: {

        },
        [Right.mobile]: {

        }
    };

    /**
     * ASSOCIATIONS
     */
    public static ASSOCIATIONS = {
        [Role.root]: [
            Right.backend,
            Right.frontend,
            Right.mobile,
        ],
        [Role.user]: [
            Right.frontend,
            Right.mobile,
        ]
    };

    /**
     * Constructor
     */
    public constructor() {
        super();

        this._rbac = new Rbac<Role, Right>(
            ACLRbac.ROLES,
            ACLRbac.RIGHTS,
            ACLRbac.ASSOCIATIONS
        );
    }

}