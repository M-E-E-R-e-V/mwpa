import {UserInfoData} from 'mwpa_schemas';

/**
 * Client-side session snapshot. Populated once per page load (in index.ts) from
 * the `/json/user/info` response, then read by pages/widgets to gate UI by
 * right — e.g. hiding an export tab the user can't use.
 *
 * This is UX only and NEVER a security boundary: every REST route is still
 * enforced server-side (checkMWPAUserIsLoginACL + aclRight → 403), so a direct
 * URL hit is rejected regardless of what the UI shows. The `rights` list here is
 * the effective, parent-expanded set the backend already computed
 * (ACLRbac.expandRights), so a plain `has()` check mirrors the server.
 */
export class Session {

    protected static _isAdmin: boolean = false;

    protected static _rights: Set<string> = new Set<string>();

    /**
     * Store the current user from a /json/user/info response. Admins resolve to
     * the `root` role on the backend (all rights), mirrored by the isAdmin flag.
     * @param {UserInfoData} [user]
     */
    public static setUser(user?: UserInfoData): void {
        Session._isAdmin = user?.isAdmin ?? false;
        Session._rights = new Set<string>(user?.rights ?? []);
    }

    /**
     * True when the user may use the given right. No right (undefined) is always
     * allowed; admins pass everything.
     * @param {string} [right]
     * @return {boolean}
     */
    public static hasRight(right?: string): boolean {
        return right === undefined || Session._isAdmin || Session._rights.has(right);
    }

}