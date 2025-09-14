import {BehaviouralStatesResponse, BehaviouralStateEntry} from 'mwpa_schemas';
import {StatusCodes} from 'figtree';
import {BehaviouralStatesRepository} from '../../../Db/MariaDb/Repositories/BehaviouralStatesRepository.js';

/**
 * List
 */
export class List {

    /**
     * Return a list
     * @return {BehaviouralStatesResponse}
     */
    public static async getList(): Promise<BehaviouralStatesResponse> {
        const list: BehaviouralStateEntry[] = [];

        const behStates = await BehaviouralStatesRepository.getInstance().findAll();

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
            list: list
        };
    }

}