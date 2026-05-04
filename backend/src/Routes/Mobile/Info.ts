import {Router} from 'express';
import {DefaultRoute} from 'figtree';
import {InfoResponse, SchemaInfoResponse} from 'mwpa_schemas';
import {Const} from '../../Const.js';
import {MobileV1StatusCode} from './MobileV1.js';

/**
 * Mobile/Info
 */
export class Info extends DefaultRoute {

    /**
     * Return the express router
     * @returns {Router}
     */
    public getExpressRouter(): Router {

        this._get(
            '/mobile/info',
            false,
            async(): Promise<InfoResponse> => {
                return {
                    statusCode: MobileV1StatusCode.OK,
                    version_api_login: Const.VERSION_API_MOBILE_LOGIN,
                    version_api_sync: Const.VERSION_API_MOBILE_SYNC
                };
            },
            {
                description: 'Return mobile API version strings.',
                responseBodySchema: SchemaInfoResponse
            }
        );

        return super.getExpressRouter();
    }

}