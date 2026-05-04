import {Router} from 'express';
import {DefaultRoute} from 'figtree';
import {checkMWPAUserIsLogin} from '../AuthCheck.js';
import {SchemaVehicleDriverListResponse, VehicleDriverListResponse} from 'mwpa_schemas';
import {List} from './VehicleDriver/List.js';

/**
 * VehicleDriver
 */
export class VehicleDriver extends DefaultRoute {

    /**
     * Return the express router
     * @returns {Router}
     */
    public getExpressRouter(): Router {

        this._get(
            '/json/vehicledriver/list',
            checkMWPAUserIsLogin,
            async(): Promise<VehicleDriverListResponse> => {
                return List.getList();
            },
            {
                description: 'Return a list of vehicle drivers joined with their linked user.',
                responseBodySchema: SchemaVehicleDriverListResponse
            }
        );

        return super.getExpressRouter();
    }

}