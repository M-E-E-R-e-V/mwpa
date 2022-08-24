import {Get, JsonController, Session} from 'routing-controllers';
import {Species as MainSpecies, SpeciesListResponse} from '../Main/Species';

/**
 * Species
 */
@JsonController()
export class Species extends MainSpecies {

    /**
     * getList
     * @param session
     */
    @Get('/mobile/species/list')
    public async getList(@Session() session: any): Promise<SpeciesListResponse> {
        return super.getList(session);
    }

}