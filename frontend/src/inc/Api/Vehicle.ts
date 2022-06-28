import {NetFetch} from '../Net/NetFetch';

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
export type VehicleListResponse = {
    status: string;
    error?: string;
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

        if (result) {
            const response = result as VehicleListResponse;

            if (response.status === 'ok') {
                return response.list;
            }
        }

        return null;
    }

}