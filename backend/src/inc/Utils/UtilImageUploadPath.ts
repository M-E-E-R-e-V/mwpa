import fs from 'fs';
import Path from 'path';
import {Config} from '../Config/Config';

/**
 * UtilImageUploadPath
 */
export class UtilImageUploadPath {

    public static getSightingDirector(sightingUnid: string): string | null {
        const config = Config.get();

        if (config?.datadir !== null && fs.existsSync(config?.datadir!)) {
            let sightingDir = Path.join(config?.datadir!, 'sighting');

            if (sightingDir.charAt(0) !== '/') {
                sightingDir = Path.join(__dirname, sightingDir);
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

}