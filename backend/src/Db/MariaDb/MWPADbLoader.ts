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
import {SpeciesGroup} from './Entities/SpeciesGroup.js';
import {User} from './Entities/User.js';
import {UserGroups} from './Entities/UserGroups.js';
import {Vehicle} from './Entities/Vehicle.js';
import {VehicleDriver} from './Entities/VehicleDriver.js';

type EntityClass = new(...args: any[]) => any;

/**
 * MWPA DB Loader
 */
export class MWPADbLoader extends DBLoader {

    /**
     * load Entities
     * @return {MixedList<EntityClass | string | EntitySchema>}
     */
    public static async loadEntities(): Promise<MixedList<EntityClass | string | EntitySchema>> {
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
            SpeciesGroup,
            User,
            UserGroups,
            Vehicle,
            VehicleDriver
        ];
    }

    /**
     * load Migrations
     * @return {MixedList<EntityClass | string>}
     */
    public static loadMigrations(): MixedList<EntityClass | string> {
        return [];
    }

}