import {Response} from 'express';
import {FileHelper, HttpFileStream, Logger, StringHelper} from 'figtree';
import got from 'got';
import {MapCacheRequest} from 'mwpa_schemas';
import Path from 'path';
import {UtilUploadPath} from '../../../Utils/UtilUploadPath.js';

/**
 * Tile
 */
export class Tile {

    private static MAP_SERVER: Map<string, string> = new Map([
        ['openstreetmap', 'https://tile.openstreetmap.org/{z}/{x}/{y}.{f}'],
        ['tms-relieve.idee.es', 'https://tms-relieve.idee.es/1.0.0/relieve/{z}/{x}/{y}.{f}']
    ]);

    /**
     * Load title
     * @param {MapCacheRequest} request
     * @param {Response} response
     */
    public static async loadTile(request: MapCacheRequest, response: Response): Promise<void> {
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
                        const downloadResponse = await got(tileUrl, {
                            responseType: 'buffer'
                        });

                        await FileHelper.create(tileFile, downloadResponse.body);
                    } catch (error) {
                        Logger.getLogger().error(StringHelper.sprintf(`Faild to download: ${tileUrl} - %e`, error));
                    }
                }
            }

            if (await FileHelper.fileExist(tileFile)) {
                if (HttpFileStream.responseFile(tileFile, 'application/octet-stream', response)) {
                    return;
                }
            }

            response.status(404).send('File not found');
        }
    }

}