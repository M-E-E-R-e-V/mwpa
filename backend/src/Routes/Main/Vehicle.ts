import {Router} from 'express';
import {DefaultRoute} from 'figtree';
import {checkMWPAUserIsLogin} from '../AuthCheck.js';
import {SchemaVehicleListResponse, VehicleListResponse} from 'mwpa_schemas';
import {List} from './Vehicle/List.js';

/**
 * Vehicle
 */
export class Vehicle extends DefaultRoute {

    /**
     * Return the express router
     * @returns {Router}
     */
    public getExpressRouter(): Router {

        this._get(
            '/json/vehicle/list',
            checkMWPAUserIsLogin,
            async(): Promise<VehicleListResponse> => {
                return List.getList();
            },
            {
                description: 'Return a list of vehicles.',
                responseBodySchema: SchemaVehicleListResponse
            }
        );

        return super.getExpressRouter();
    }

}