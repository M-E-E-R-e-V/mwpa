import fs from 'fs';
import Path from 'path';
import {Config} from '../Config/Config';

/**
 * UtilImageUploadPath
 */
export class UtilImageUploadPath {

    /**
     * getSightingDirector
     * @param sightingUnid
     */
    public static getSightingDirector(sightingUnid: string): string | null {
        const config = Config.get();

        if (config?.datadir !== null && fs.existsSync(config?.datadir!)) {
            let sightingDir = Path.join(config?.datadir!, 'sighting');

            if (sightingDir.charAt(0) !== '/') {
                sightingDir = Path.join(Path.resolve(), sightingDir);
            }

            if (!fs.existsSync(sightingDir)) {
                fs.mkdirSync(sightingDir, {
                    recursive: true,
                    mode: 0o744
                });
            }

            const sightingUidDir = Path.join(sightingDir, sightingUnid);

            if (!fs.existsSync(sightingUidDir)) {
                fs.mkdirSync(sightingUidDir, 0o744);
            }

            return sightingUidDir;
        }

        return null;
    }

    /**
     * Create the mapche directory
     * @param {string} server
     * @param {string} z
     * @param {string} x
     * @return {string|null}
     */
    public static getMapCacheDirector(server: string, z: string, x: string): string | null {
        const config = Config.get();

        if (config?.datadir !== null && fs.existsSync(config?.datadir!)) {
            let mapcacheDir = Path.join(config?.datadir!, 'mapcache', server, z, x);

            if (mapcacheDir.charAt(0) !== '/') {
                mapcacheDir = Path.join(Path.resolve(), mapcacheDir);
            }

            if (!fs.existsSync(mapcacheDir)) {
                fs.mkdirSync(mapcacheDir, {
                    recursive: true,
                    mode: 0o744
                });
            }

            return mapcacheDir;
        }

        return null;
    }
}