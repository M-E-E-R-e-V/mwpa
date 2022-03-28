import {Get, JsonController, Session} from 'routing-controllers';
import {EncounterCategories as EncounterCategoriesDB} from '../../inc/Db/MariaDb/Entity/EncounterCategories';
import {MariaDbHelper} from '../../inc/Db/MariaDb/MariaDbHelper';

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
@JsonController()
export class EncounterCategories {

    /**
     * getList
     * @param session
     */
    @Get('/json/encountercategories/list')
    public async getList(@Session() session: any): Promise<EncounterCategoriesResponse> {
        let status = 'ok';
        let errormsg = '';
        const list: EncounterCategorieEntry[] = [];

        if ((session.user !== undefined) && session.user.isLogin) {
            const enCatRepository = MariaDbHelper.getConnection().getRepository(EncounterCategoriesDB);
            const cates = await enCatRepository.find();

            for (const cat of cates) {
                list.push({
                    id: cat.id,
                    name: cat.name
                });
            }
        } else {
            status = 'error';
            errormsg = 'Please login first!';
        }

        return {
            status,
            error: errormsg,
            list
        };
    }

}