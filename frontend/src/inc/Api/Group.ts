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
 * GroupListResponse
 */
export type GroupListResponse = DefaultReturn & {
    list?: GroupEntry[];
};

/**
 * Group
 */
export class Group {

    /**
     * getGroupList
     */
    public static async getGroupList(): Promise<GroupEntry[] | null> {
        const result = await NetFetch.getData('/json/group/list');

        if (result && result.statusCode) {
            const tresult = result as GroupListResponse;

            switch(tresult.statusCode) {
                case StatusCodes.OK:
                    if (tresult.list) {
                        return tresult.list;
                    }

                    throw new Error('Grouplist is empty return!');

                case StatusCodes.UNAUTHORIZED:
                    throw new UnauthorizedError();
            }
        }

        return null;
    }
}