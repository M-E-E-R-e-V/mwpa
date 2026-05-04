import {MWPASessionUserData} from 'mwpa_schemas';

/**
 * Default session-user shape for MWPA. figtree's built-in defaultInitSession returns
 * `{isLogin:false, userid:'', role:''}` which does not validate against
 * SchemaMWPASessionData (userid:number plus the extended fields), so without this
 * helper the very first request from a fresh client throws a 500.
 * @return {Promise<MWPASessionUserData>}
 */
export const defaultMWPASessionInit = async(): Promise<MWPASessionUserData> => ({
    isLogin: false,
    isAdmin: false,
    isMobileLogin: false,
    userid: 0,
    main_group_id: 0,
    main_organization_id: 0,
    groups: [],
    organizations: []
});