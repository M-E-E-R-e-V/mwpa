import {DBRepository} from 'figtree';
import {SpeciesGroup} from '../Entities/SpeciesGroup.js';

/**
 * SpeciesGroup repository
 */
export class SpeciesGroupRepository extends DBRepository<SpeciesGroup> {

    /**
     * register name
     */
    public static REGISTER_NAME = 'species_group';

    /**
     * Retrun a instance
     * @return {SpeciesGroupRepository}
     */
    public static getInstance(): SpeciesGroupRepository {
        return super.getSingleInstance(SpeciesGroup);
    }

}