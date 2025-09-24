import {HttpRouteLoader, IDefaultRoute, SwaggerUIRoute} from 'figtree';
import {BehaviouralStates} from './Main/BehaviouralStates.js';
import {EncounterCategories} from './Main/EncounterCategories.js';
import {Group} from './Main/Group.js';
import Login from './Main/Login.js';
import {MapCache} from './Map/MapCache.js';

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
            new BehaviouralStates(),
            new EncounterCategories(),
            new Group()
        ];
    }

}