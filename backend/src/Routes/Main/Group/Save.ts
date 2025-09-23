import {DefaultReturn, StatusCodes} from 'figtree';
import {GroupEntry} from '../../../app/Main/Group.js';
import {Group as GroupDB} from '../../../Db/MariaDb/Entities/Group.js';
import {GroupRepository} from '../../../Db/MariaDb/Repositories/GroupRepository.js';

/**
 * Save
 */
export class Save {

    /**
     * Save the group
     * @param {GroupEntry} entry
     * @return {DefaultReturn}
     */
    public static async saveGroup(entry: GroupEntry): Promise<DefaultReturn> {
        let aGroup: GroupDB|null = null;

        if (entry.id !== 0) {
            aGroup = await GroupRepository.getInstance().findOne(entry.id);
        }

        if (aGroup === null) {
            aGroup = new GroupDB();
        }

        aGroup.description = entry.description;
        aGroup.role = entry.role;
        aGroup.organization_id = entry.organization_id;

        await GroupRepository.getInstance().save(aGroup);

        return {
            statusCode: StatusCodes.OK
        };
    }

}