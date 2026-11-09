import {HttpRouteLoader, IDefaultRoute, ServiceRoute, SwaggerUIRoute} from '@stefanwerfling/figtree';
import {APP_NAME} from '../Application/AppName.js';
import {checkMWPAAdminIsLogin} from './AuthCheck.js';
import {Acl} from './Main/Acl.js';
import {Ais} from './Main/Ais.js';
import {BehaviouralStates} from './Main/BehaviouralStates.js';
import {Blacklist} from './Main/Blacklist.js';
import {Devices} from './Main/Devices.js';
import {Earthquake} from './Main/Earthquake.js';
import {EncounterCategories} from './Main/EncounterCategories.js';
import {ExternalTour} from './Main/ExternalTour.js';
import {Group} from './Main/Group.js';
import {Login} from './Main/Login.js';
import {Lookup} from './Main/Lookup.js';
import {Organization} from './Main/Organization.js';
import {OrphanTracks} from './Main/OrphanTracks.js';
import {QuickConnect} from './Main/QuickConnect.js';
import {SightingMovement} from './Main/SightingMovement.js';
import {Sightings} from './Main/Sightings.js';
import {Species} from './Main/Species.js';
import {SpeciesGroup} from './Main/SpeciesGroup.js';
import {TableFilter} from './Main/TableFilter.js';
import {Tours} from './Main/Tours.js';
import {User} from './Main/User.js';
import {Vehicle} from './Main/Vehicle.js';
import {VehicleDriver} from './Main/VehicleDriver.js';
import {DarwinCore} from './Export/DarwinCore.js';
import {OfficeReport} from './Export/OfficeReport.js';
import {SightingsForR} from './Export/SightingsForR.js';
import {MapCache} from './Map/MapCache.js';
import {Info as MobileInfo} from './Mobile/Info.js';
import {Login as MobileLogin} from './Mobile/Login.js';
import {QuickConnect as MobileQuickConnect} from './Mobile/QuickConnect.js';
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
            // figtree's built-in /json/v1/service/{status,start,stop,invoke}
            // — admin-only, lets the Services admin page list every running
            // job, read its cron + last_run + status, and trigger an ad-hoc
            // invoke without waiting for the next tick.
            new ServiceRoute(APP_NAME, checkMWPAAdminIsLogin),
            new Login(),
            new MapCache(),
            new Acl(),
            new Ais(),
            new BehaviouralStates(),
            new Blacklist(),
            new Devices(),
            new Earthquake(),
            new EncounterCategories(),
            new ExternalTour(),
            new Group(),
            new Lookup(),
            new Organization(),
            new OrphanTracks(),
            new QuickConnect(),
            new Sightings(),
            new SightingMovement(),
            new Species(),
            new SpeciesGroup(),
            new TableFilter(),
            new Tours(),
            new User(),
            new Vehicle(),
            new VehicleDriver(),
            new OfficeReport(),
            new DarwinCore(),
            new SightingsForR(),
            new MobileInfo(),
            new MobileLogin(),
            new MobileQuickConnect(),
            new MobileReuse(),
            new MobileSightings(),
            new MobileSightingTourTracking(),
            new MobileTour(),
            new MobileTrackingArea()
        ];
    }

}