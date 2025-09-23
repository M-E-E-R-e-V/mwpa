import {DBRepository} from 'figtree';
import {Group} from '../Entities/Group.js';

/**
 * Group repository
 */
export class GroupRepository extends DBRepository<Group> {

    /**
     * register name
     */
    public static REGISTER_NAME = 'group';

    /**
     * Retrun a instance
     * @return {GroupRepository}
     */
    public static getInstance(): GroupRepository {
        return super.getSingleInstance(Group);
    }

}