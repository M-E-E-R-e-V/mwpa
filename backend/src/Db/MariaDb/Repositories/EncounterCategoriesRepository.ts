import {DBRepository} from 'figtree';
import {EncounterCategories} from '../Entities/EncounterCategories.js';

/**
 * Encounter categories repository
 */
export class EncounterCategoriesRepository extends DBRepository<EncounterCategories> {

    /**
     * register name
     */
    public static REGISTER_NAME = 'encounter_categories';

    /**
     * Retrun a instance
     * @return {EncounterCategoriesRepository}
     */
    public static getInstance(): EncounterCategoriesRepository {
        return super.getSingleInstance(EncounterCategories);
    }

}