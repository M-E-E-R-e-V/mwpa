import {Get, JsonController, Session} from 'routing-controllers';
import {Species as SpeciesDB} from '../../inc/Db/MariaDb/Entity/Species';
import {MariaDbHelper} from '../../inc/Db/MariaDb/MariaDbHelper';

/**
 * SpeciesEntry
 */
export type SpeciesEntry = {
    id: number;
    name: string;
};

/**
 * SpeciesListResponse
 */
export type SpeciesListResponse = {
    status: string;
    error?: string;
    list: SpeciesEntry[];
};

/**
 * Species
 */
@JsonController()
export class Species {

    /**
     * getList
     * @param session
     */
    @Get('/json/species/list')
    public async getList(@Session() session: any): Promise<SpeciesListResponse> {
        let status = 'ok';
        let errormsg = '';
        const list: SpeciesEntry[] = [];

        if ((session.user !== undefined) && session.user.isLogin) {
            const speciesRepository = MariaDbHelper.getConnection().getRepository(SpeciesDB);
            const species = await speciesRepository.find();

            for (const specie of species) {
                list.push({
                    id: specie.id,
                    name: specie.name
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