import {NetFetch} from '../Net/NetFetch';
import {UnauthorizedError} from './Error/UnauthorizedError';
import {StatusCodes} from './Status/StatusCodes';
import {DefaultReturn} from './Types/DefaultReturn';

/**
 * BehaviouralStateEntry
 */
export type BehaviouralStateEntry = {
    id: number;
    name: string;
    description: string;
    isdeleted: boolean;
};

/**
 * BehaviouralStatesResponse
 */
export type BehaviouralStatesResponse = DefaultReturn & {
    list: BehaviouralStateEntry[];
};

/**
 * BehaviouralStates
 */
export class BehaviouralStates {

    /**
     * getList
     */
    public static async getList(): Promise<null|BehaviouralStateEntry[]> {
        const result = await NetFetch.getData('/json/behaviouralstates/list');

        if (result && result.statusCode) {
            switch (result.statusCode) {
                case StatusCodes.OK: {
                    const response = result as BehaviouralStatesResponse;
                    return response.list;
                }

                case StatusCodes.UNAUTHORIZED:
                    throw new UnauthorizedError();
            }
        }

        return null;
    }

}