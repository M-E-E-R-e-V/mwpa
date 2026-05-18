import {DBLoader, DbSetupState} from 'figtree';
import {EntitySchema, MixedList} from 'typeorm';
import {BehaviouralStates} from './Entities/BehaviouralStates.js';
import {Devices} from './Entities/Devices.js';
import {EncounterCategories} from './Entities/EncounterCategories.js';
import {ExternalReceiver} from './Entities/ExternalReceiver.js';
import {ExternalTour} from './Entities/ExternalTour.js';
import {Group} from './Entities/Group.js';
import {OrganizationExternalTourSource} from './Entities/OrganizationExternalTourSource.js';
import {GroupsRoles} from './Entities/GroupsRoles.js';
import {Organization} from './Entities/Organization.js';
import {OrganizationTrackingArea} from './Entities/OrganizationTrackingArea.js';
import {Settings} from './Entities/Settings.js';
import {Sighting} from './Entities/Sighting.js';
import {SightingExtended} from './Entities/SightingExtended.js';
import {SightingFishingEffort} from './Entities/SightingFishingEffort.js';
import {SightingMovement} from './Entities/SightingMovement.js';
import {SightingMovementTrack} from './Entities/SightingMovementTrack.js';
import {SightingTour} from './Entities/SightingTour.js';
import {SightingTourTracking} from './Entities/SightingTourTracking.js';
import {SightingTourTrackingPending} from './Entities/SightingTourTrackingPending.js';
import {SightingViewFilter} from './Entities/SightingViewFilter.js';
import {Species} from './Entities/Species.js';
import {SpeciesExternLink} from './Entities/SpeciesExternLink.js';
import {SpeciesGroup} from './Entities/SpeciesGroup.js';
import {User} from './Entities/User.js';
import {UserGroups} from './Entities/UserGroups.js';
import {UsersRights} from './Entities/UsersRights.js';
import {UsersRoleRights} from './Entities/UsersRoleRights.js';
import {UsersRoles} from './Entities/UsersRoles.js';
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
            // figtree-internal: tracks which 'once'-mode DBSetupHooks have already run.
            DbSetupState,
            BehaviouralStates,
            Devices,
            EncounterCategories,
            ExternalReceiver,
            ExternalTour,
            Group,
            GroupsRoles,
            Organization,
            OrganizationExternalTourSource,
            OrganizationTrackingArea,
            Settings,
            Sighting,
            SightingExtended,
            SightingFishingEffort,
            SightingMovement,
            SightingMovementTrack,
            SightingTour,
            SightingTourTracking,
            SightingTourTrackingPending,
            SightingViewFilter,
            Species,
            SpeciesExternLink,
            SpeciesGroup,
            User,
            UserGroups,
            UsersRights,
            UsersRoleRights,
            UsersRoles,
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