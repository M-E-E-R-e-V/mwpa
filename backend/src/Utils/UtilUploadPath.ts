import {DirHelper} from 'figtree';
import Path from 'path';
import {MWPAConfig} from '../Config/MWPAConfig.js';

/**
 * Helper class for uploads
 */
export class UtilUploadPath {

    public static DIRECTORY_SIGHTING = 'sighting';
    public static DIRECTORY_MAPCACHE = 'mapcache';

    /**
     * Return the data directory for MWPA
     * @return {string|null}
     */
    public static async getDataDirectory(): Promise<string|null> {
        const config = MWPAConfig.getInstance().get();

        if (config !== null && config.datadir !== null) {
            if (await DirHelper.directoryExist(config.datadir)) {
                return config.datadir;
            }
        }

        return null;
    }

    /**
     * Return the directory for image uploads by sightings
     * @param {string} sightingUnid
     * @return {string|null}
     */
    public static async getSightingDirectory(sightingUnid: string): Promise<string|null> {
        const datadir = await this.getDataDirectory();

        if (datadir) {
            const sightingDir = Path.join(datadir, this.DIRECTORY_SIGHTING);

            if (!await DirHelper.directoryExist(sightingDir)) {
                await DirHelper.mkdir(sightingDir, true);
            }

            const sightingUidDir = Path.join(sightingDir, sightingUnid);

            if (!await DirHelper.directoryExist(sightingUidDir)) {
                await DirHelper.mkdir(sightingUidDir, true);
            }

            return sightingUidDir;
        }

        return null;
    }

    /**
     * Return the mapcache directory
     * @param {string} server - a provider/server name
     * @param {string} z
     * @param {string} x
     * @return {string|null}
     */
    public static async getMapCacheDirectory(server: string, z: string, x: string): Promise<string|null> {
        const datadir = await this.getDataDirectory();

        if (datadir) {
            const mapcacheDir = Path.join(datadir, this.DIRECTORY_MAPCACHE, server, z, x);

            if (!await DirHelper.directoryExist(mapcacheDir)) {
                await DirHelper.mkdir(mapcacheDir, true);
            }

            return mapcacheDir;
        }

        return null;
    }

}