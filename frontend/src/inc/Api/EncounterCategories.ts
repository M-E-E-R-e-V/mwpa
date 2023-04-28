import {NetFetch} from '../Net/NetFetch';
import {UnauthorizedError} from './Error/UnauthorizedError';
import {StatusCodes} from './Status/StatusCodes';
import {DefaultReturn} from './Types/DefaultReturn';

/**
 * EncounterCategorieEntry
 */
export type EncounterCategorieEntry = {
    id: number;
    name: string;
    isdeleted: boolean;
};

/**
 * EncounterCategoriesResponse
 */
export type EncounterCategoriesResponse = DefaultReturn & {
    list: EncounterCategorieEntry[];
};

/**
 * EncounterCategories
 */
export class EncounterCategories {

    /**
     * getList
     */
    public static async getList(): Promise<null|EncounterCategorieEntry[]> {
        const result = await NetFetch.getData('/json/encountercategories/list');

        if (result && result.statusCode) {
            switch(result.statusCode) {
                case StatusCodes.OK:
                    const response = result as EncounterCategoriesResponse;
                    return response.list;

                case StatusCodes.UNAUTHORIZED:
                    throw new UnauthorizedError();
            }
        }

        return null;
    }

}