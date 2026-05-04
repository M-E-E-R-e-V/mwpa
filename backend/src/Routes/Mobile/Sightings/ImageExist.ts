import * as fs from 'fs';
import Path from 'path';
import {Logger} from 'figtree';
import {Vts} from 'vts';
import {SightingImageExistRequest, SightingImageExistResponse} from 'mwpa_schemas';
import {DevicesRepository} from '../../../Db/MariaDb/Repositories/DevicesRepository.js';
import {SightingRepository} from '../../../Db/MariaDb/Repositories/SightingRepository.js';
import {UtilUploadPath} from '../../../Utils/UtilUploadPath.js';
import {MobileV1StatusCode} from '../MobileV1.js';

/**
 * ImageExist
 */
export class ImageExist {

    /**
     * Check whether a previously uploaded image exists on disk for the given sighting.
     * Mobile uses this to skip re-uploading images that are already on the server.
     * @param {string} deviceIdentity
     * @param {SightingImageExistRequest} request
     * @return {SightingImageExistResponse}
     */
    public static async check(deviceIdentity: string, request?: SightingImageExistRequest): Promise<SightingImageExistResponse> {
        if (Vts.isUndefined(request)) {
            return {
                statusCode: MobileV1StatusCode.INTERNAL_ERROR,
                msg: 'Request incomplete'
            };
        }

        const device = await DevicesRepository.getInstance().findByIdentity(deviceIdentity);

        if (!device) {
            Logger.getLogger().warn(`Mobile/Sightings::existImage: Device not found by: ${deviceIdentity}`);
            return {
                statusCode: MobileV1StatusCode.INTERNAL_ERROR,
                msg: 'Device not found!'
            };
        }

        const sighting = await SightingRepository.getInstance().findByUnid(request.unid);

        if (!sighting) {
            Logger.getLogger().warn(`Mobile/Sightings::existImage: Sighting not found: ${request.unid}`);
            return {
                statusCode: MobileV1StatusCode.INTERNAL_ERROR,
                msg: 'Sighting not found!'
            };
        }

        const sightingDir = await UtilUploadPath.getSightingDirectory(request.unid);

        if (sightingDir === null) {
            return {
                statusCode: MobileV1StatusCode.INTERNAL_ERROR,
                msg: 'Image upload faild, data director not found!'
            };
        }

        return {
            statusCode: MobileV1StatusCode.OK,
            isExist: fs.existsSync(Path.join(sightingDir, request.filename))
        };
    }

}