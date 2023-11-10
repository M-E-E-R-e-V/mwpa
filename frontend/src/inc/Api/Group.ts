import {NetFetch} from '../Net/NetFetch';
import {UnauthorizedError} from './Error/UnauthorizedError';
import {StatusCodes} from './Status/StatusCodes';
import {DefaultReturn} from './Types/DefaultReturn';

/**
 * GroupEntry
 */
export type GroupEntry = {
    id: number;
    role: string;
    organization_id: number;
    description: string;
};

/**
 * Group Organization
 */
export type GroupOrganization = {
    id: number;
    name: string;
    location: string;
    lat: string;
    lon: string;
    country: string;
};

/**
 * GroupListResponse
 */
export type GroupListResponse = DefaultReturn & {
    list?: GroupEntry[];
    organizationList?: GroupOrganization[];
};

/**
 * Group
 */
export class Group {

    /**
     * getGroupList
     */
    public static async getGroupList(): Promise<GroupListResponse | null> {
        const result = await NetFetch.getData('/json/group/list');

        if (result && result.statusCode) {
            const tresult = result as GroupListResponse;

            switch (tresult.statusCode) {
                case StatusCodes.OK:
                    return tresult;

                case StatusCodes.UNAUTHORIZED:
                    throw new UnauthorizedError();
            }
        }

        return null;
    }

}