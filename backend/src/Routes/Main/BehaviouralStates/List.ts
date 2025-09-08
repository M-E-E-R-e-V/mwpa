import {BehaviouralStatesResponse, BehaviouralStateEntry} from 'mwpa_schemas';
import {StatusCodes} from 'figtree';

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



        return {
            statusCode: StatusCodes.OK,
            list: []
        };
    }

}