import {StatusCodes} from 'figtree-schemas';
import {SpeciesGroupEntry, SpeciesGroupListResponse} from 'mwpa_schemas';
import {SpeciesGroupRepository} from '../../../Db/MariaDb/Repositories/SpeciesGroupRepository.js';

/**
 * List
 */
export class List {

    /**
     * Return all species groups.
     * @return {SpeciesGroupListResponse}
     */
    public static async getList(): Promise<SpeciesGroupListResponse> {
        const groups = await SpeciesGroupRepository.getInstance().findAll();

        const list: SpeciesGroupEntry[] = [];

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

}