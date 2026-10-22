import {Router} from 'express';
import {DefaultRoute} from '@stefanwerfling/figtree';
import {checkMWPAUserIsLoginACL} from '../AuthCheck.js';
import {
    SchemaVehicleDriverListResponse,
    VehicleDriverListResponse,
    RightVehicles,
} from 'mwpa_schemas';
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
            checkMWPAUserIsLoginACL,
            async(): Promise<VehicleDriverListResponse> => {
                return List.getList();
            },
            {
                description: 'Return a list of vehicle drivers joined with their linked user.',
                aclRight: RightVehicles.vehicles_read,
                responseBodySchema: SchemaVehicleDriverListResponse
            }
        );

        return super.getExpressRouter();
    }

}