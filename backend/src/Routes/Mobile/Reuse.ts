import {Router} from 'express';
import {DefaultRoute} from 'figtree';
import {
    MobileBehaviouralStatesResponse,
    MobileEncounterCategoriesResponse,
    MobileSpeciesListResponse,
    MobileUserInfoResponse,
    MobileVehicleDriverListResponse,
    MobileVehicleListResponse,
    SchemaMWPASessionData,
    SchemaMobileBehaviouralStatesResponse,
    SchemaMobileEncounterCategoriesResponse,
    SchemaMobileSpeciesListResponse,
    SchemaMobileUserInfoResponse,
    SchemaMobileVehicleDriverListResponse,
    SchemaMobileVehicleListResponse
} from 'mwpa_schemas';
import {checkMWPAUserIsLogin} from '../AuthCheck.js';
import {defaultMWPASessionInit} from '../SessionDefault.js';
import {List as BehaviouralStatesList} from '../Main/BehaviouralStates/List.js';
import {List as EncounterCategoriesList} from '../Main/EncounterCategories/List.js';
import {List as SpeciesList} from '../Main/Species/List.js';
import {Info as UserInfo} from '../Main/User/Info.js';
import {List as VehicleList} from '../Main/Vehicle/List.js';
import {List as VehicleDriverList} from '../Main/VehicleDriver/List.js';
import {toV1} from './MobileV1.js';

/**
 * Mobile reuse — exposes the Main read-only handlers under /mobile/* paths.
 * Each endpoint delegates to the Main implementation, then adapts the response
 * to the Mobile-V1 envelope (numeric statusCode) via {@link toV1}.
 */
export class Reuse extends DefaultRoute {

    /**
     * Return the express router
     * @returns {Router}
     */
    public getExpressRouter(): Router {

        this._get(
            '/mobile/behaviouralstates/list',
            checkMWPAUserIsLogin,
            async(): Promise<MobileBehaviouralStatesResponse> => toV1(await BehaviouralStatesList.getList()),
            {
                description: 'Mobile alias for /json/behaviouralstates/list.',
                responseBodySchema: SchemaMobileBehaviouralStatesResponse
            }
        );

        this._get(
            '/mobile/encountercategories/list',
            checkMWPAUserIsLogin,
            async(): Promise<MobileEncounterCategoriesResponse> => toV1(await EncounterCategoriesList.getList()),
            {
                description: 'Mobile alias for /json/encountercategories/list.',
                responseBodySchema: SchemaMobileEncounterCategoriesResponse
            }
        );

        this._get(
            '/mobile/species/list',
            checkMWPAUserIsLogin,
            async(): Promise<MobileSpeciesListResponse> => toV1(await SpeciesList.getList()),
            {
                description: 'Mobile alias for /json/species/list.',
                responseBodySchema: SchemaMobileSpeciesListResponse
            }
        );

        this._get(
            '/mobile/vehicle/list',
            checkMWPAUserIsLogin,
            async(): Promise<MobileVehicleListResponse> => toV1(await VehicleList.getList()),
            {
                description: 'Mobile alias for /json/vehicle/list.',
                responseBodySchema: SchemaMobileVehicleListResponse
            }
        );

        this._get(
            '/mobile/vehicledriver/list',
            checkMWPAUserIsLogin,
            async(): Promise<MobileVehicleDriverListResponse> => toV1(await VehicleDriverList.getList()),
            {
                description: 'Mobile alias for /json/vehicledriver/list.',
                responseBodySchema: SchemaMobileVehicleDriverListResponse
            }
        );

        this._get(
            '/mobile/user/info',
            false,
            async(_req, _res, data): Promise<MobileUserInfoResponse> => {
                const userId = data.session?.user?.userid ?? 0;
                return toV1(await UserInfo.getInfo(userId));
            },
            {
                description: 'Mobile alias for /json/user/info.',
                responseBodySchema: SchemaMobileUserInfoResponse,
                sessionSchema: SchemaMWPASessionData,
                sessionInit: defaultMWPASessionInit,
            }
        );

        return super.getExpressRouter();
    }

}
