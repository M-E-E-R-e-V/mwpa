import fs from 'fs';
import Path from 'path';
import {Get, JsonController, Param, Session} from 'routing-controllers';
import {Logger} from '../../inc/Logger/Logger';
import {FileHelper} from '../../inc/Utils/FileHelper';
import {UtilImageUploadPath} from '../../inc/Utils/UtilImageUploadPath';
import got from 'got';
import { writeFile } from 'fs/promises';

@JsonController()
export class MapCache {

    static MAP_SERVER: Map<string, string> = new Map([
        ['openstreetmap', 'https://tile.openstreetmap.org/{z}/{x}/{y}.{f}'],
        ['tms-relieve.idee.es', 'https://tms-relieve.idee.es/1.0.0/relieve/{z}/{x}/{y}.{f}']
    ]);

    @Get('/mapcache/:server/:z/:x/:y.:fileformat')
    public async getTile(
        @Session() session: any,
        @Param('server') server: string,
        @Param('z') z: string,
        @Param('x') x: string,
        @Param('y') y: string,
        @Param('fileformat') fileformat: string
    ): Promise<Buffer | null> {
        if ((session.user !== undefined) && session.user.isLogin) {
            let useServer = 'openstreetmap';

            if (MapCache.MAP_SERVER.has(server)) {
                useServer = server;
            }

            const mapCacheDir = UtilImageUploadPath.getMapCacheDirector(useServer, z, x);

            if (mapCacheDir !== null) {
                const serverUrl = MapCache.MAP_SERVER.get(useServer)!;
                const tileUrl = serverUrl
                .replace('{z}', z)
                .replace('{x}', x)
                .replace('{y}', y)
                .replace('{f}', fileformat);

                const tileFile = Path.join(mapCacheDir, `${y}.${fileformat}`);

                if (await FileHelper.fileExist(tileFile)) {
                    return fs.readFileSync(tileFile);
                }

                try {
                    const response = await got(tileUrl, {
                        responseType: 'buffer'
                    });

                    // Schreibe den Buffer in eine Datei
                    await writeFile(tileFile, response.body);
                } catch (error) {
                    Logger.log(`Faild to download: ${tileUrl}`);
                }

                if (await FileHelper.fileExist(tileFile)) {
                    return fs.readFileSync(tileFile);
                }
            }
        }

        return null;
    }

    @Get('/mapcachewms/:server/')
    public async getWms(
        @Session() session: any
    ): Promise<Buffer | null> {
        if ((session.user !== undefined) && session.user.isLogin) {

        }

        return null;
    }

}