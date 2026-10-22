import {Router} from 'express';
import {DefaultRoute} from '@stefanwerfling/figtree';
import {checkMWPAUserIsLoginACL} from '../AuthCheck.js';
import {RightApi, SchemaMWPASessionData, SchemaTrackingAreaHomeResponse, TrackingAreaHomeResponse} from 'mwpa_schemas';
import {defaultMWPASessionInit} from '../SessionDefault.js';
import {HomeArea} from './TrackingArea/HomeArea.js';

/**
 * Mobile/TrackingArea
 */
export class TrackingArea extends DefaultRoute {

    /**
     * Return the express router
     * @returns {Router}
     */
    public getExpressRouter(): Router {

        this._get(
            '/mobile/trackingarea/homearea',
            checkMWPAUserIsLoginACL,
            async(_req, _res, data): Promise<TrackingAreaHomeResponse> => {
                const mainOrganizationId = data.session?.user?.main_organization_id ?? 0;
                return HomeArea.getHomeArea(mainOrganizationId);
            },
            {
                aclRight: RightApi.mobile,
                description: 'Return the home tracking area polygon for the session user.',
                responseBodySchema: SchemaTrackingAreaHomeResponse,
                sessionSchema: SchemaMWPASessionData,
                sessionInit: defaultMWPASessionInit,
            }
        );

        return super.getExpressRouter();
    }

}
