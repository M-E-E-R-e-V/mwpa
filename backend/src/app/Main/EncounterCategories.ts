import {Get, JsonController, Session} from 'routing-controllers';
import {EncounterCategories as EncounterCategoriesDB} from '../../inc/Db/MariaDb/Entity/EncounterCategories';
import {MariaDbHelper} from '../../inc/Db/MariaDb/MariaDbHelper';
import {DefaultReturn} from '../../inc/Routes/DefaultReturn';
import {StatusCodes} from '../../inc/Routes/StatusCodes';

/**
 * EncounterCategorieEntry
 */
export type EncounterCategorieEntry = {
    id: number;
    name: string;
    description: string;
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
@JsonController()
export class EncounterCategories {

    /**
     * getList
     * @param session
     */
    @Get('/json/encountercategories/list')
    public async getList(@Session() session: any): Promise<EncounterCategoriesResponse> {
        if ((session.user !== undefined) && session.user.isLogin) {
            const list: EncounterCategorieEntry[] = [];

            const enCatRepository = MariaDbHelper.getConnection().getRepository(EncounterCategoriesDB);
            const cates = await enCatRepository.find();

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
                list
            };
        }

        return {
            statusCode: StatusCodes.UNAUTHORIZED,
            list: []
        };
    }

}