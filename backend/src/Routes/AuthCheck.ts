import {Request, Response} from 'express';
import {ACL, DefaultRouteCheckUserIsLogin, RouteError} from 'figtree';
import {SchemaRequestData, StatusCodes} from 'figtree-schemas';
import {MWPASessionUserData, SchemaMWPASessionData} from 'mwpa_schemas';
import {Vts} from 'vts';

/**
 * Request-data schema with the MWPA-extended session shape (userid:number etc.).
 * figtree's DefaultRouteCheckUserIsLogin validates the request against the base
 * SchemaRequestData, which insists on userid:string and rejects our session — so we
 * pass our own request-data schema in.
 */
const SchemaMWPARequestData = Vts.object({
    session: SchemaMWPASessionData
}, {
    description: 'MWPA-specific request-data schema (with extended session).',
    objectSchema: {
        ignoreAdditionalItems: true
    }
});

/**
 * checkUserLogin helper for routes that use SchemaMWPASessionData. Pass this
 * instead of `true` when wiring _get/_post.
 * @param {Request} req
 * @param {Response} _res
 * @return {Promise<boolean>}
 */
export const checkMWPAUserIsLogin = async(req: Request, _res: Response): Promise<boolean> => DefaultRouteCheckUserIsLogin(req, true, SchemaMWPARequestData as unknown as typeof SchemaRequestData);

/**
 * Boolean check ("am I logged in?") that does not throw a 401, against the MWPA
 * session schema. Use inside handler bodies (e.g. /json/islogin, /mobile/islogin).
 * @param {Request} req
 * @return {boolean}
 */
export const isMWPAUserLogin = (req: Request): boolean => DefaultRouteCheckUserIsLogin(req, false, SchemaMWPARequestData as unknown as typeof SchemaRequestData);

/**
 * ACL-aware variant of checkMWPAUserIsLogin. figtree's DefaultRoute calls this
 * with `description.aclRight` as the third arg (see DefaultRoute.js: `checkUserLogin(req, res, description.aclRight)`).
 *
 * Returns false (→ figtree responds 401) when the user is not logged in.
 * Throws RouteError(FORBIDDEN) when the right is missing — the caller IS
 * authenticated but lacks permission, which is a 403 not a 401.
 *
 * Usage:
 *   this._post(url, checkMWPAUserIsLoginACL, handler, {aclRight: RightSightings.sightings_write, ...});
 * @param {Request} req
 * @param {Response} _res
 * @param {string|undefined} aclRight
 * @return {Promise<boolean>}
 */
export const checkMWPAUserIsLoginACL = async(
    req: Request,
    _res: Response,
    aclRight?: string
): Promise<boolean> => {
    if (!DefaultRouteCheckUserIsLogin(req, true, SchemaMWPARequestData as unknown as typeof SchemaRequestData)) {
        return false;
    }

    if (aclRight) {
        const user = (req.session as unknown as {user?: MWPASessionUserData;}).user;
        const role = user?.role ?? '';
        const rights = user?.rights ?? [];

        if (role === '' || !await ACL.getInstance().checkAccess(role, aclRight, rights)) {
            throw new RouteError(StatusCodes.FORBIDDEN, 'User has no access!');
        }
    }

    return true;
};