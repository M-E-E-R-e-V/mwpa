import {Get, JsonController, Session} from 'routing-controllers';
import {MariaDbHelper} from '../../inc/Db/MariaDb/MariaDbHelper';
import {DefaultReturn} from '../../inc/Routes/DefaultReturn';
import {StatusCodes} from '../../inc/Routes/StatusCodes';
import {BehaviouralStates as BehaviouralStatesDB} from '../../inc/Db/MariaDb/Entity/BehaviouralStates';

/**
 * BehaviouralStateEntry
 */
export type BehaviouralStateEntry = {
    id: number;
    name: string;
    description: string;
    isdeleted: boolean;
};

/**
 * BehaviouralStatesResponse
 */
export type BehaviouralStatesResponse = DefaultReturn & {
    list: BehaviouralStateEntry[];
};

/**
 * BehaviouralStates
 */
@JsonController()
export class BehaviouralStates {

    /**
     * getList
     * @param session
     */
    @Get('/json/behaviouralstates/list')
    public async getList(@Session() session: any): Promise<BehaviouralStatesResponse> {
        if ((session.user !== undefined) && session.user.isLogin) {
            const list: BehaviouralStateEntry[] = [];

            const behStatesRepository = MariaDbHelper.getConnection().getRepository(BehaviouralStatesDB);
            const behStates = await behStatesRepository.find();

            for (const behState of behStates) {
                list.push({
                    id: behState.id,
                    name: behState.name,
                    description: behState.description,
                    isdeleted: behState.isdeleted
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