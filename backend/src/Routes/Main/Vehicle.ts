import {Router} from 'express';
import {DefaultRoute} from 'figtree';
import {DefaultReturn, SchemaDefaultReturn, StatusCodes} from 'figtree-schemas';
import {
    SchemaMWPASessionData,
    SchemaVehicleDeleteRequest,
    SchemaVehicleEntry,
    SchemaVehicleListResponse,
    VehicleListResponse
} from 'mwpa_schemas';
import {checkMWPAUserIsLogin} from '../AuthCheck.js';
import {defaultMWPASessionInit} from '../SessionDefault.js';
import {Delete} from './Vehicle/Delete.js';
import {List} from './Vehicle/List.js';
import {Save} from './Vehicle/Save.js';

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

        this._post(
            '/json/vehicle/save',
            checkMWPAUserIsLogin,
            async(_req, _res, data): Promise<DefaultReturn> => {
                if (!data.session?.user?.isAdmin) {
                    return {
                        statusCode: StatusCodes.FORBIDDEN
                    };
                }
                return Save.saveVehicle(data.body);
            },
            {
                description: 'Insert or update a vehicle (admin only).',
                bodySchema: SchemaVehicleEntry,
                responseBodySchema: SchemaDefaultReturn,
                sessionSchema: SchemaMWPASessionData,
                sessionInit: defaultMWPASessionInit,
            }
        );

        this._post(
            '/json/vehicle/delete',
            checkMWPAUserIsLogin,
            async(_req, _res, data): Promise<DefaultReturn> => {
                if (!data.session?.user?.isAdmin) {
                    return {
                        statusCode: StatusCodes.FORBIDDEN
                    };
                }
                return Delete.deleteVehicle(data.body);
            },
            {
                description: 'Soft-delete a vehicle (admin only).',
                bodySchema: SchemaVehicleDeleteRequest,
                responseBodySchema: SchemaDefaultReturn,
                sessionSchema: SchemaMWPASessionData,
                sessionInit: defaultMWPASessionInit,
            }
        );

        return super.getExpressRouter();
    }

}