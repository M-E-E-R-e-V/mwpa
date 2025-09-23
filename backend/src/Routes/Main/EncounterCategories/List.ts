import {StatusCodes} from 'figtree';
import {EncounterCategorieEntry, EncounterCategoriesResponse} from 'mwpa_schemas';
import {EncounterCategoriesRepository} from '../../../Db/MariaDb/Repositories/EncounterCategoriesRepository.js';

/**
 * List
 */
export class List {

    /**
     * Return a list encounter categories
     * @return {EncounterCategoriesResponse}
     */
    public static async getList(): Promise<EncounterCategoriesResponse> {
        const list: EncounterCategorieEntry[] = [];
        const cates = await EncounterCategoriesRepository.getInstance().findAll();

        for (const cat of cates) {
            list.push({
                id: cat.id,
                name: cat.name,
                description: cat.description,
                isdeleted: cat.isdeleted
            });
        }

        return {
            statusCode: StatusCodes.OK,
            list: list
        };
    }

}