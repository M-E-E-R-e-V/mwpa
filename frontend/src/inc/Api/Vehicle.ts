import {NetFetch} from '../Net/NetFetch';
import {UnauthorizedError} from './Error/UnauthorizedError';
import {StatusCodes} from './Status/StatusCodes';
import {DefaultReturn} from './Types/DefaultReturn';

/**
 * VehicleEntry
 */
export type VehicleEntry = {
    id: number;
    name: string;
    isdeleted: boolean;
    organization_id: number;
    in_use: boolean;
};

/**
 * VehicleListResponse
 */
export type VehicleListResponse = DefaultReturn & {
    list: VehicleEntry[];
};

/**
 * VehicleDelete
 */
export type VehicleDelete = {
    id: number;
};

/**
 * Vehicle
 */
export class Vehicle {

    /**
     * getList
     */
    public static async getList(): Promise<null|VehicleEntry[]> {
        const result = await NetFetch.getData('/json/vehicle/list');

        if (result && result.statusCode) {
            switch (result.statusCode) {
                case StatusCodes.OK: {
                    const response = result as VehicleListResponse;
                    return response.list;
                }

                case StatusCodes.UNAUTHORIZED:
                    throw new UnauthorizedError();
            }
        }

        return null;
    }

    /**
     * save
     * @param vehicle
     */
    public static async save(vehicle: VehicleEntry): Promise<boolean> {
        const result = await NetFetch.postData('/json/vehicle/save', vehicle);

        if (result && result.statusCode) {
            switch (result.statusCode) {
                case StatusCodes.OK:
                    return true;

                case StatusCodes.UNAUTHORIZED:
                    throw new UnauthorizedError();

                default:
                    if (result.msg) {
                        throw Error(result.msg);
                    }
            }
        }

        return false;
    }

    /**
     * delete
     * @param vdelete
     */
    public static async delete(vdelete: VehicleDelete): Promise<boolean> {
        const result = await NetFetch.postData('/json/vehicle/delete', vdelete);

        if (result && result.statusCode) {
            switch (result.statusCode) {
                case StatusCodes.OK:
                    return true;

                case StatusCodes.UNAUTHORIZED:
                    throw new UnauthorizedError();

                default:
                    if (result.msg) {
                        throw Error(result.msg);
                    }
            }
        }

        return false;
    }

}