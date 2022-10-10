/**
 * SessionUserData
 */
export type SessionUserData = {

    /**
     * is login
     */
    isLogin: boolean;

    /**
     * is admin
     */
    isAdmin: boolean;

    /**
     * is mobile login
     */
    isMobileLogin: boolean;

    /**
     * user id
     */
    userid: number;

    /**
     * device identity is set by mobile login
     */
    deviceIdentity?: string;

    /**
     * main user group id
     */
    main_group_id: number;

    /**
     * main organization id
     */
    main_organization_id: number;

    /**
     * groups
     * a list with all group ids by user
     */
    groups: number[];

    /**
     * organizations
     * a list with all organization ids by user
     */
    organizations: number[];
};