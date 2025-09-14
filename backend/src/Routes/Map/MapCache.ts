import {Router} from 'express';
import {DefaultRoute} from 'figtree';
import {SchemaMapCacheRequest} from 'mwpa_schemas';
import {Tile} from './Tile/Tile.js';

/**
 * MapCache
 */
export class MapCache extends DefaultRoute {

    /**
     * Return the express router
     * @returns {Router}
     */
    public getExpressRouter(): Router {

        this._get(
            '/mapcache/:server/:z/:x/:y.:fileformat',
            false,
            async(
                req,
                res,
                data
            ) => {
                await Tile.loadTile(data.params!, res);
            },
            {
                description: 'Return map cache (tile) by any provider.',
                pathSchema: SchemaMapCacheRequest,
            }
        );

        return super.getExpressRouter();
    }

}