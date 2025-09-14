import {DBRepository} from 'figtree';
import {BehaviouralStates} from '../Entities/BehaviouralStates.js';

/**
 * Behavioural states repository
 */
export class BehaviouralStatesRepository extends DBRepository<BehaviouralStates> {

    /**
     * register name
     */
    public static REGISTER_NAME = 'behavioural_states';

    /**
     * Get an instance
     * @return {BehaviouralStatesRepository}
     */
    public static getInstance(): BehaviouralStatesRepository {
        return super.getSingleInstance(BehaviouralStates);
    }

}