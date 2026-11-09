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
     * @param {boolean} [lookup] true = read-only lookup route for the sighting/tour/analytics pages
     *   (needs sightings_read, tours_read, analytics_read or external_tours_read instead of the master-data read right).
     */
    public static async getList(lookup: boolean = false): Promise<null|VehicleDriverEntry[]> {
        const result = await NetFetch.getData(lookup ? '/json/lookup/vehicledrivers' : '/json/vehicledriver/list');

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