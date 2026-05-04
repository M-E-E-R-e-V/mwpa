import {Request, Response} from 'express';
import {DefaultRouteCheckUserIsLogin} from 'figtree';
import {SchemaRequestData} from 'figtree-schemas';
import {SchemaMWPASessionData} from 'mwpa_schemas';
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