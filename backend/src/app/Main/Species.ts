import {Get, JsonController, Post, Session} from 'routing-controllers';
import {Species as SpeciesDB} from '../../inc/Db/MariaDb/Entity/Species';
import {MariaDbHelper} from '../../inc/Db/MariaDb/MariaDbHelper';
import {DefaultReturn} from '../../inc/Routes/DefaultReturn';
import {StatusCodes} from '../../inc/Routes/StatusCodes';

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
export type SpeciesListResponse = DefaultReturn & {
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
        if ((session.user !== undefined) && session.user.isLogin) {
            const list: SpeciesEntry[] = [];

            const speciesRepository = MariaDbHelper.getConnection().getRepository(SpeciesDB);
            const species = await speciesRepository.find();

            for (const specie of species) {
                list.push({
                    id: specie.id,
                    name: specie.name
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

    /**
     * save
     * @param session
     * @param request
     */
    @Post('/json/species/save')
    public async save(@Session() session: any, @Body() request: SpeciesEntry): Promise<DefaultReturn> {
        if ((session.user !== undefined) && session.user.isLogin && session.user.isAdmin) {

        }

        return {
            statusCode: StatusCodes.UNAUTHORIZED
        };
    }

}