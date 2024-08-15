import {NetFetch} from '../Net/NetFetch';
import {UnauthorizedError} from './Error/UnauthorizedError';
import {StatusCodes} from './Status/StatusCodes';
import {DefaultReturn} from './Types/DefaultReturn';

export type SpeciesGroupEntry = {
    id: number;
    name: string;
    color: string;
};

export type SpeciesGroupListResponse = DefaultReturn & {
    list: SpeciesGroupEntry[];
};

/**
 * Speces group api
 */
export class SpeciesGroup {

    /**
     * Return a list of speces group
     */
    public static async getList(): Promise<null|SpeciesGroupEntry[]> {
        const result = await NetFetch.getData('/json/speciesgroup/list');

        if (result && result.statusCode) {
            switch (result.statusCode) {
                case StatusCodes.OK:
                    // eslint-disable-next-line no-case-declarations
                    const response = result as SpeciesGroupListResponse;
                    return response.list;

                case StatusCodes.UNAUTHORIZED:
                    throw new UnauthorizedError();
            }
        }

        return null;
    }

}