import {HttpRouteLoader, IDefaultRoute, SwaggerUIRoute} from 'figtree';
import {Acl} from './Main/Acl.js';
import {BehaviouralStates} from './Main/BehaviouralStates.js';
import {Devices} from './Main/Devices.js';
import {EncounterCategories} from './Main/EncounterCategories.js';
import {Group} from './Main/Group.js';
import {Login} from './Main/Login.js';
import {Organization} from './Main/Organization.js';
import {SightingMovement} from './Main/SightingMovement.js';
import {Sightings} from './Main/Sightings.js';
import {Species} from './Main/Species.js';
import {SpeciesGroup} from './Main/SpeciesGroup.js';
import {Tours} from './Main/Tours.js';
import {User} from './Main/User.js';
import {Vehicle} from './Main/Vehicle.js';
import {VehicleDriver} from './Main/VehicleDriver.js';
import {OfficeReport} from './Export/OfficeReport.js';
import {MapCache} from './Map/MapCache.js';
import {Info as MobileInfo} from './Mobile/Info.js';
import {Login as MobileLogin} from './Mobile/Login.js';
import {Reuse as MobileReuse} from './Mobile/Reuse.js';
import {Sightings as MobileSightings} from './Mobile/Sightings.js';
import {SightingTourTracking as MobileSightingTourTracking} from './Mobile/SightingTourTracking.js';
import {Tour as MobileTour} from './Mobile/Tour.js';
import {TrackingArea as MobileTrackingArea} from './Mobile/TrackingArea.js';

/**
 * Route loader
 */
export class RouteLoader extends HttpRouteLoader {

    /**
     * Load routes for HTTP Server
     * @return {IDefaultRoute[]}
     */
    public static async loadRoutes(): Promise<IDefaultRoute[]> {
        SwaggerUIRoute.getInstance().setInfo('MWPA', '1.0.1');

        return [
            SwaggerUIRoute.getInstance(),
            new Login(),
            new MapCache(),
            new Acl(),
            new BehaviouralStates(),
            new Devices(),
            new EncounterCategories(),
            new Group(),
            new Organization(),
            new Sightings(),
            new SightingMovement(),
            new Species(),
            new SpeciesGroup(),
            new Tours(),
            new User(),
            new Vehicle(),
            new VehicleDriver(),
            new OfficeReport(),
            new MobileInfo(),
            new MobileLogin(),
            new MobileReuse(),
            new MobileSightings(),
            new MobileSightingTourTracking(),
            new MobileTour(),
            new MobileTrackingArea()
        ];
    }

}