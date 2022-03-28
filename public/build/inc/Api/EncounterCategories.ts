import {NetFetch} from '../Net/NetFetch';

/**
 * EncounterCategorieEntry
 */
export type EncounterCategorieEntry = {
    id: number;
    name: string;
};

/**
 * EncounterCategoriesResponse
 */
export type EncounterCategoriesResponse = {
    status: string;
    error?: string;
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

        if (result) {
            const response = result as EncounterCategoriesResponse;

            if (response.status === 'ok') {
                return response.list;
            }
        }

        return null;
    }

}