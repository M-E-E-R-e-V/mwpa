import {Response} from 'express';
import {FileHelper, Logger, StringHelper} from '@stefanwerfling/figtree';
import {createHash} from 'crypto';
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
     * Tile servers (OSM tile usage policy) block clients without an
     * identifying User-Agent — Node's fetch default included.
     */
    public static readonly USER_AGENT = 'MWPA tile cache (https://github.com/M-E-E-R-e-V/mwpa)';

    /**
     * MD5 of the "Access blocked" image tile.openstreetmap.org returns
     * (with HTTP 200) to blocked clients. Never stored; cached copies from
     * before the User-Agent fix count as a cache miss and are fetched again.
     */
    public static readonly BLOCKED_TILE_MD5 = new Set(['8e8d1ff492c2bdae445a83ccdb8e449f']);

    /**
     * Is this the image of a blocked client instead of a map tile?
     * @param {Buffer} buffer
     * @return {boolean}
     */
    public static isBlockedTile(buffer: Buffer): boolean {
        return Tile.BLOCKED_TILE_MD5.has(createHash('md5').update(buffer).digest('hex'));
    }

    /**
     * Load title
     * @param {MapCacheRequest} request
     * @param {Response} response
     */
    // Up to 7 digits: at zoom 16 x/y already reach 65535, at zoom 22 4194303.
    private static TILE_COORD: RegExp = /^\d{1,7}$/u;

    private static TILE_MAX_ZOOM: number = 22;

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

        const zoom = Number(request.z);
        const tileCount = 2 ** zoom;

        if (zoom > Tile.TILE_MAX_ZOOM ||
            Number(request.x) >= tileCount ||
            Number(request.y) >= tileCount) {
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

            let cached = await FileHelper.fileExist(tileFile);

            if (cached && Tile.isBlockedTile(await fs.readFile(tileFile))) {
                await fs.unlink(tileFile).catch(() => undefined);
                cached = false;
            }

            if (!cached) {
                const serverUrl = Tile.MAP_SERVER.get(useServer);

                if (serverUrl !== undefined) {
                    const tileUrl = serverUrl
                    .replace('{z}', request.z)
                    .replace('{x}', request.x)
                    .replace('{y}', request.y)
                    .replace('{f}', request.fileformat);

                    try {
                        const downloadResponse = await fetch(tileUrl, {
                            headers: {'User-Agent': Tile.USER_AGENT}
                        });

                        if (!downloadResponse.ok) {
                            throw new Error(`HTTP ${downloadResponse.status} ${downloadResponse.statusText}`);
                        }

                        const buffer = Buffer.from(await downloadResponse.arrayBuffer());

                        if (Tile.isBlockedTile(buffer)) {
                            throw new Error('tile server blocked the request (access blocked tile)');
                        }

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