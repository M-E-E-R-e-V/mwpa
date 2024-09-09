import {NetFetch} from '../Net/NetFetch';
import {UnauthorizedError} from './Error/UnauthorizedError';
import {StatusCodes} from './Status/StatusCodes';
import {DefaultReturn} from './Types/DefaultReturn';

/**
 * VehicleDriverEntry
 */
export type VehicleDriverEntry = {
    id: number;
    description: string;
    user: {
        user_id: number;
        name: string;
    };
};

/**
 * VehicleDriverListResponse
 */
export type VehicleDriverListResponse = DefaultReturn & {
    list: VehicleDriverEntry[];
};

/**
 * Driver
 */
export class VehicleDriver {

    /**
     * getList
     */
    public static async getList(): Promise<null|VehicleDriverEntry[]> {
        const result = await NetFetch.getData('/json/vehicledriver/list');

        if (result && result.statusCode) {
            switch (result.statusCode) {
                case StatusCodes.OK: {
                    const response = result as VehicleDriverListResponse;
                    return response.list;
                }

                case StatusCodes.UNAUTHORIZED:
                    throw new UnauthorizedError();
            }
        }

        return null;
    }
}