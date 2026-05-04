import {Response} from 'express';
import {FileHelper, HttpFileStream, Logger} from 'figtree';
import Path from 'path';
import {SightingImageGetRequest} from 'mwpa_schemas';
import {SightingRepository} from '../../../Db/MariaDb/Repositories/SightingRepository.js';
import {UtilUploadPath} from '../../../Utils/UtilUploadPath.js';

/**
 * GetImage
 */
export class GetImage {

    /**
     * Stream a sighting image file to the http response.
     * Sends 404 when the sighting, the upload directory or the file is missing.
     * @param {SightingImageGetRequest} request
     * @param {Response} response
     */
    public static async serveImage(request: SightingImageGetRequest, response: Response): Promise<void> {
        const sighting = await SightingRepository.getInstance().findOne(request.id);

        if (!sighting) {
            Logger.getLogger().info(`Main/Sightings::getImage: sighting not found by id: ${request.id}`);
            response.status(404).send('File not found');
            return;
        }

        const sightingDir = await UtilUploadPath.getSightingDirectory(sighting.unid);

        if (!sightingDir) {
            Logger.getLogger().info(`Main/Sightings::getImage: image upload empty by id: ${request.id}`);
            response.status(404).send('File not found');
            return;
        }

        const filePath = Path.join(sightingDir, request.filename);

        if (!await FileHelper.fileExist(filePath)) {
            response.status(404).send('File not found');
            return;
        }

        if (!HttpFileStream.responseFile(filePath, 'application/octet-stream', response)) {
            response.status(500).send('Stream error');
        }
    }

}