import {HttpRouteLoader, IDefaultRoute, SwaggerUIRoute} from 'figtree';
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
            new MapCache()
        ];
    }

}