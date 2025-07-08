import {DBLoader} from 'figtree';
import {EntitySchema, MixedList} from 'typeorm';
import {BehaviouralStates} from './Entities/BehaviouralStates.js';
import {Devices} from './Entities/Devices.js';
import {EncounterCategories} from './Entities/EncounterCategories.js';

/**
 * MWPA DB Loader
 */
export class MWPADbLoader extends DBLoader {

    /**
     * load Entities
     * @return {MixedList<Function | string | EntitySchema>}
     */
    // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
    public static async loadEntities(): Promise<MixedList<Function | string | EntitySchema>> {
        return [
            BehaviouralStates,
            Devices,
            EncounterCategories
        ];
    }

    /**
     * load Migrations
     * @return {MixedList<Function | string> }
     */
    // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
    public static loadMigrations(): MixedList<Function | string> {
        return [];
    }

}