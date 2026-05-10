import {NetFetch} from '../Net/NetFetch';
import {UnauthorizedError} from './Error/UnauthorizedError';
import {StatusCodes} from './Status/StatusCodes';
import {DefaultReturn} from './Types/DefaultReturn';

export type DeviceEntry = {
    id: number;
    identity: string;
    description: string;
    user_id: number;
    user_name: string;
    user_email: string;
    organization_id: number;
    organization_name: string;
    create_datetime: number;
    update_datetime: number;
    sighting_count: number;
    tour_count: number;
    last_sighting_datetime: number;
};

export type DevicesListResponse = DefaultReturn & {
    list?: DeviceEntry[];
};

/**
 * Devices admin API. Single endpoint /json/devices/list — read-only for now,
 * gated by RightUsers.users_read.
 */
export class Devices {

    public static async getList(): Promise<DeviceEntry[]> {
        const result = await NetFetch.postData('/json/devices/list', {}) as DevicesListResponse;

        if (result?.statusCode === StatusCodes.UNAUTHORIZED) {
            throw new UnauthorizedError();
        }
        if (result?.statusCode === StatusCodes.OK) {
            return result.list ?? [];
        }
        return [];
    }

}