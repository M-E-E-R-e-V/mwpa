import {Router} from 'express';
import {DefaultRoute} from '@stefanwerfling/figtree';
import {checkMWPAUserIsLoginACL} from '../AuthCheck.js';
import {OpenTourResponse, RightApi, SchemaMWPASessionData, SchemaOpenTourResponse} from 'mwpa_schemas';
import {defaultMWPASessionInit} from '../SessionDefault.js';
import {OpenTour} from './Tour/OpenTour.js';

/**
 * Mobile/Tour
 *
 * NOTE: original old-backend file did not have a @Get/@Post decorator on getOpenTour.
 * This port wires it to GET /mobile/tour/opentour to make it routable again.
 */
export class Tour extends DefaultRoute {

    /**
     * Return the express router
     * @returns {Router}
     */
    public getExpressRouter(): Router {

        this._get(
            '/mobile/tour/opentour',
            checkMWPAUserIsLoginACL,
            async(_req, _res, data): Promise<OpenTourResponse> => {
                const userId = data.session?.user?.userid ?? 0;
                return OpenTour.getOpenTour(userId);
            },
            {
                aclRight: RightApi.mobile,
                description: 'Return the currently-open tour for the session user (status=1).',
                responseBodySchema: SchemaOpenTourResponse,
                sessionSchema: SchemaMWPASessionData,
                sessionInit: defaultMWPASessionInit,
            }
        );

        return super.getExpressRouter();
    }

}
