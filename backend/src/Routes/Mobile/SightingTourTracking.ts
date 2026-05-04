import {Router} from 'express';
import {DefaultRoute} from 'figtree';
import {
    DefaultMobileV1Return,
    SchemaDefaultMobileV1Return,
    SchemaMWPASessionData,
    SchemaSightingTourTrackingCheckRequest,
    SchemaSightingTourTrackingCheckResponse,
    SchemaSightingTourTrackingRequest,
    SightingTourTrackingCheckResponse
} from 'mwpa_schemas';
import {checkMWPAUserIsLogin} from '../AuthCheck.js';
import {defaultMWPASessionInit} from '../SessionDefault.js';
import {Check} from './SightingTourTracking/Check.js';
import {Save} from './SightingTourTracking/Save.js';
import {MobileV1StatusCode} from './MobileV1.js';

/**
 * Mobile/SightingTourTracking
 */
export class SightingTourTracking extends DefaultRoute {

    /**
     * Return the express router
     * @returns {Router}
     */
    public getExpressRouter(): Router {

        this._post(
            '/mobile/sighting/tourtracking/check',
            checkMWPAUserIsLogin,
            async(_req, _res, data): Promise<SightingTourTrackingCheckResponse> => {
                const sessionUser = data.session?.user;
                if (!sessionUser?.isMobileLogin || !sessionUser.deviceIdentity) {
                    return {
                        statusCode: MobileV1StatusCode.UNAUTHORIZED
                    };
                }
                return Check.check(sessionUser.deviceIdentity, data.body);
            },
            {
                description: 'Check whether the server has all tracking points for a tour.',
                bodySchema: SchemaSightingTourTrackingCheckRequest,
                responseBodySchema: SchemaSightingTourTrackingCheckResponse,
                sessionSchema: SchemaMWPASessionData,
                sessionInit: defaultMWPASessionInit,
            }
        );

        this._post(
            '/mobile/sighting/tourtracking/save',
            checkMWPAUserIsLogin,
            async(_req, _res, data): Promise<DefaultMobileV1Return> => {
                const sessionUser = data.session?.user;
                if (!sessionUser?.isMobileLogin || !sessionUser.deviceIdentity) {
                    return {
                        statusCode: MobileV1StatusCode.UNAUTHORIZED
                    };
                }
                return Save.save(sessionUser.deviceIdentity, data.body);
            },
            {
                description: 'Persist a batch of tracking points (grouped per tour, dedupe by unid).',
                bodySchema: SchemaSightingTourTrackingRequest,
                responseBodySchema: SchemaDefaultMobileV1Return,
                sessionSchema: SchemaMWPASessionData,
                sessionInit: defaultMWPASessionInit,
            }
        );

        return super.getExpressRouter();
    }

}
