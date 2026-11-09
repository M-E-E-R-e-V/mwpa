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
     * @param {boolean} [lookup] true = read-only lookup route for the sighting/tour/analytics pages
     *   (needs sightings_read, tours_read, analytics_read or external_tours_read instead of the master-data read right).
     */
    public static async getList(lookup: boolean = false): Promise<null|BehaviouralStateEntry[]> {
        const result = await NetFetch.getData(lookup ? '/json/lookup/behaviouralstates' : '/json/behaviouralstates/list');

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