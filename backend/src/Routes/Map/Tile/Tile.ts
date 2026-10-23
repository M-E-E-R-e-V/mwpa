import {Response} from 'express';
import {FileHelper, Logger, StringHelper} from '@stefanwerfling/figtree';
import fs from 'fs/promises';
import {MapCacheRequest} from 'mwpa_schemas';
import Path from 'path';
import {UtilUploadPath} from '../../../Utils/UtilUploadPath.js';

/**
 * Tile
 */
export class Tile {

    private static MAP_SERVER: Map<string, string> = new Map([
        ['openstreetmap', 'https://tile.openstreetmap.org/{z}/{x}/{y}.{f}'],
        ['tms-relieve.idee.es', 'https://tms-relieve.idee.es/1.0.0/relieve/{z}/{x}/{y}.{f}'],
        ['emodnet-bathymetry', 'https://tiles.emodnet-bathymetry.eu/latest/mean_atlas_land/web_mercator/{z}/{x}/{y}.{f}']
    ]);

    /**
     * Load title
     * @param {MapCacheRequest} request
     * @param {Response} response
     */
    private static TILE_COORD: RegExp = /^\d{1,4}$/u;

    private static TILE_FORMAT: RegExp = /^[a-zA-Z0-9]{1,5}$/u;

    public static async loadTile(request: MapCacheRequest, response: Response): Promise<void> {
        // This route is unauthenticated, and z/x/y/fileformat flow into a
        // Path.join under the datadir — validate them strictly so a request
        // like `..%2f..%2fetc` can't traverse out of the tile cache (arbitrary
        // file read via fs.readFile, or write/mkdir on a cache miss). `server`
        // is already allow-listed against MAP_SERVER below.
        if (!Tile.TILE_COORD.test(request.z) ||
            !Tile.TILE_COORD.test(request.x) ||
            !Tile.TILE_COORD.test(request.y) ||
            !Tile.TILE_FORMAT.test(request.fileformat)) {
            response.status(400).send('Bad tile request');
            return;
        }

        let useServer = 'openstreetmap';

        if (Tile.MAP_SERVER.has(request.server)) {
            useServer = request.server;
        }

        const mapCacheDir = await UtilUploadPath.getMapCacheDirectory(useServer, request.z, request.x);

        if (mapCacheDir) {
            const tileFile = Path.join(mapCacheDir, `${request.y}.${request.fileformat}`);

            if (!await FileHelper.fileExist(tileFile)) {
                const serverUrl = Tile.MAP_SERVER.get(useServer);

                if (serverUrl !== undefined) {
                    const tileUrl = serverUrl
                    .replace('{z}', request.z)
                    .replace('{x}', request.x)
                    .replace('{y}', request.y)
                    .replace('{f}', request.fileformat);

                    try {
                        const downloadResponse = await fetch(tileUrl);

                        if (!downloadResponse.ok) {
                            throw new Error(`HTTP ${downloadResponse.status} ${downloadResponse.statusText}`);
                        }

                        const buffer = Buffer.from(await downloadResponse.arrayBuffer());
                        await FileHelper.create(tileFile, buffer);
                    } catch (error) {
                        Logger.getLogger().error(StringHelper.sprintf(`Faild to download: ${tileUrl} - %e`, error));
                    }
                }
            }

            if (await FileHelper.fileExist(tileFile)) {
                const buffer = await fs.readFile(tileFile);
                response.setHeader('Content-Type', `image/${request.fileformat}`);
                response.end(buffer);
                return;
            }

            response.status(404).send('File not found');
        }
    }

}