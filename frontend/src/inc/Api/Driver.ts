import {NetFetch} from '../Net/NetFetch';

/**
 * DriverEntry
 */
export type DriverEntry = {
    id: number;
    userid: number;
    name: string;
};

/**
 * DriverListResponse
 */
export type DriverListResponse = {
    status: string;
    error?: string;
    list: DriverEntry[];
};

/**
 * Driver
 */
export class Driver {

    /**
     * getList
     */
    public static async getList(): Promise<null|DriverEntry[]> {
        const result = await NetFetch.getData('/json/driver/list');

        if (result) {
            const response = result as DriverListResponse;

            if (response.status === 'ok') {
                return response.list;
            }
        }

        return null;
    }
}