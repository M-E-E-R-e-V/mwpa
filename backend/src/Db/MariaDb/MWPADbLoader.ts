import {DBLoader} from 'figtree';
import {EntitySchema, MixedList} from 'typeorm';
import {BehaviouralStates} from './Entities/BehaviouralStates.js';
import {Devices} from './Entities/Devices.js';
import {EncounterCategories} from './Entities/EncounterCategories.js';
import {ExternalReceiver} from './Entities/ExternalReceiver.js';
import {Group} from './Entities/Group.js';
import {Organization} from './Entities/Organization.js';
import {OrganizationTrackingArea} from './Entities/OrganizationTrackingArea.js';
import {Settings} from './Entities/Settings.js';
import {Sighting} from './Entities/Sighting.js';
import {SightingExtended} from './Entities/SightingExtended.js';
import {SightingTour} from './Entities/SightingTour.js';
import {SightingTourTracking} from './Entities/SightingTourTracking.js';
import {SightingViewFilter} from './Entities/SightingViewFilter.js';
import {Species} from './Entities/Species.js';
import {SpeciesExternLink} from './Entities/SpeciesExternLink.js';
import {User} from './Entities/User.js';
import {UserGroups} from './Entities/UserGroups.js';
import {Vehicle} from './Entities/Vehicle.js';
import {VehicleDriver} from './Entities/VehicleDriver.js';

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
            EncounterCategories,
            ExternalReceiver,
            Group,
            Organization,
            OrganizationTrackingArea,
            Settings,
            Sighting,
            SightingExtended,
            SightingTour,
            SightingTourTracking,
            SightingViewFilter,
            Species,
            SpeciesExternLink,
            User,
            UserGroups,
            Vehicle,
            VehicleDriver
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