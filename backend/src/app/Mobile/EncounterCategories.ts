import {Get, JsonController, Session} from 'routing-controllers';
import {EncounterCategories as MainEncounterCategories, EncounterCategoriesResponse} from '../Main/EncounterCategories';

/**
 * EncounterCategories
 */
@JsonController()
export class EncounterCategories extends MainEncounterCategories {

    /**
     * getList
     * @param session
     */
    @Get('/mobile/encountercategories/list')
    public async getList(@Session() session: any): Promise<EncounterCategoriesResponse> {
        return super.getList(session);
    }

}