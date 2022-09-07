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
};

/**
 * VehicleListResponse
 */
export type VehicleListResponse = DefaultReturn & {
    list: VehicleEntry[];
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
            switch(result.statusCode) {
                case StatusCodes.OK:
                    const response = result as VehicleListResponse;
                    return response.list;

                case StatusCodes.UNAUTHORIZED:
                    throw new UnauthorizedError();
            }
        }

        return null;
    }

}