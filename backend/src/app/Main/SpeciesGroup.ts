import {Get, JsonController, Session} from 'routing-controllers';
import {SpeciesGroup as SpeciesGroupDB} from '../../Db/MariaDb/Entities/SpeciesGroup.js';
import {MariaDbHelper} from '../../inc/Db/MariaDb/MariaDbHelper';
import {DefaultReturn} from '../../inc/Routes/DefaultReturn';
import {StatusCodes} from '../../inc/Routes/StatusCodes';

export type SpeciesGroupEntry = {
    id: number;
    name: string;
    color: string;
};

export type SpeciesGroupListResponse = DefaultReturn & {
    list: SpeciesGroupEntry[];
};

/**
 * Species Group Route object
 */
@JsonController()
export class SpeciesGroup {

    /**
     * Return a list of species group
     * @param session
     */
    @Get('/json/speciesgroup/list')
    public async getSpeciesGroupList(@Session() session: any): Promise<SpeciesGroupListResponse> {
        const list: SpeciesGroupEntry[] = [];

        if ((session.user !== undefined) && session.user.isLogin) {
            const speciesGroupRepository = MariaDbHelper.getConnection().getRepository(SpeciesGroupDB);
            const groups = await speciesGroupRepository.find();

            for (const group of groups) {
                list.push({
                    id: group.id,
                    name: group.name,
                    color: group.color
                });
            }

            return {
                statusCode: StatusCodes.OK,
                list
            };
        }

        return {
            statusCode: StatusCodes.UNAUTHORIZED,
            list
        };
    }

}