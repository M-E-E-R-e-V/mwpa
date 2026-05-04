import * as fs from 'fs';
import Path from 'path';
import {Logger} from 'figtree';
import {DefaultMobileV1Return} from 'mwpa_schemas';
import {DevicesRepository} from '../../../Db/MariaDb/Repositories/DevicesRepository.js';
import {SightingRepository} from '../../../Db/MariaDb/Repositories/SightingRepository.js';
import {UtilUploadPath} from '../../../Utils/UtilUploadPath.js';
import {MobileV1StatusCode} from '../MobileV1.js';

/**
 * Multipart fields for /mobile/sighting/image/save (parsed by multer or similar).
 */
export type ImageSaveInput = {
    file?: {buffer: Buffer};
    unid?: string;
    filename?: string;
    size?: string;
};

/**
 * ImageSave
 */
export class ImageSave {

    /**
     * Persist an uploaded image to the sighting upload directory and verify the size matches.
     * @param {string} deviceIdentity
     * @param {ImageSaveInput} input
     * @return {DefaultMobileV1Return}
     */
    public static async save(deviceIdentity: string, input: ImageSaveInput): Promise<DefaultMobileV1Return> {
        if (!input.file || !input.unid || !input.filename || input.size === undefined) {
            return {
                statusCode: MobileV1StatusCode.INTERNAL_ERROR,
                msg: 'Request incomplete'
            };
        }

        const device = await DevicesRepository.getInstance().findByIdentity(deviceIdentity);

        if (!device) {
            Logger.getLogger().warn(`Mobile/Sightings::saveImage: Device not found by: ${deviceIdentity}`);
            return {
                statusCode: MobileV1StatusCode.INTERNAL_ERROR,
                msg: 'Device not found!'
            };
        }

        const sighting = await SightingRepository.getInstance().findByUnid(input.unid);

        if (!sighting) {
            Logger.getLogger().warn(`Mobile/Sightings::saveImage: Sighting not found by unid: ${input.unid}`);
            return {
                statusCode: MobileV1StatusCode.INTERNAL_ERROR,
                msg: 'Sighting not found!'
            };
        }

        const sightingDir = await UtilUploadPath.getSightingDirectory(input.unid);

        if (sightingDir === null) {
            return {
                statusCode: MobileV1StatusCode.INTERNAL_ERROR,
                msg: 'Image upload faild, data director not found!'
            };
        }

        const filePath = Path.join(sightingDir, input.filename);
        fs.writeFileSync(filePath, input.file.buffer);
        Logger.getLogger().info(`Mobile/Sightings::saveImage: file write to: ${filePath}`);

        const fileStats = fs.statSync(filePath);

        if (fileStats.size !== parseInt(input.size, 10)) {
            Logger.getLogger().warn(`Mobile/Sightings::saveImage: size mismatch — posted ${input.size} vs stored ${fileStats.size}`);
            return {
                statusCode: MobileV1StatusCode.INTERNAL_ERROR,
                msg: 'Image file size is not correct!'
            };
        }

        return {
            statusCode: MobileV1StatusCode.OK
        };
    }

}