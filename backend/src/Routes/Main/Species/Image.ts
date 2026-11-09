import * as fs from 'fs';
import {Response} from 'express';
import {FileHelper, HttpFileStream, Logger} from '@stefanwerfling/figtree';
import {DefaultReturn, StatusCodes} from 'figtree-schemas';
import Path from 'path';
import {SpeciesDeleteRequest, SpeciesImageGetRequest} from 'mwpa_schemas';
import {SpeciesRepository} from '../../../Db/MariaDb/Repositories/SpeciesRepository.js';
import {UtilSafePath} from '../../../Utils/UtilSafePath.js';
import {UtilUploadPath} from '../../../Utils/UtilUploadPath.js';

/**
 * Detected raster image format of an upload.
 */
type SpeciesImageFormat = {
    ext: string;
    mime: string;
};

/**
 * Species images: upload (admin dialog), remove and serve. Files live flat in
 * `<datadir>/species/` as `species-<id>-<timestamp>.<ext>`; the species row
 * keeps the current file name in `image` (the timestamp doubles as cache
 * buster in the URL). Only raster formats detected by magic bytes are
 * accepted — no SVG, since it could carry script when opened directly.
 */
export class Image {

    /**
     * Max upload size in bytes (also the multer limit).
     */
    public static readonly MAX_SIZE = 5 * 1024 * 1024;

    /**
     * Detect PNG / JPEG / GIF / WebP by their magic bytes.
     * @param {Buffer} buf
     * @return {SpeciesImageFormat|null}
     */
    public static detectFormat(buf: Buffer): SpeciesImageFormat | null {
        if (buf.length >= 8 && buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]))) {
            return {ext: 'png', mime: 'image/png'};
        }

        if (buf.length >= 3 && buf[0] === 0xFF && buf[1] === 0xD8 && buf[2] === 0xFF) {
            return {ext: 'jpg', mime: 'image/jpeg'};
        }

        if (buf.length >= 6 && (buf.subarray(0, 6).toString('ascii') === 'GIF87a' || buf.subarray(0, 6).toString('ascii') === 'GIF89a')) {
            return {ext: 'gif', mime: 'image/gif'};
        }

        if (buf.length >= 12 && buf.subarray(0, 4).toString('ascii') === 'RIFF' && buf.subarray(8, 12).toString('ascii') === 'WEBP') {
            return {ext: 'webp', mime: 'image/webp'};
        }

        return null;
    }

    /**
     * Mime type by the stored file extension.
     * @param {string} filename
     * @return {string}
     */
    public static mimeOf(filename: string): string {
        switch (Path.extname(filename).toLowerCase()) {
            case '.png':
                return 'image/png';

            case '.jpg':
                return 'image/jpeg';

            case '.gif':
                return 'image/gif';

            case '.webp':
                return 'image/webp';

            default:
                return 'application/octet-stream';
        }
    }

    /**
     * Store an uploaded image for a species and replace the previous one.
     * Caller must verify admin role.
     * @param {number} speciesId
     * @param {Buffer|undefined} buffer
     * @return {DefaultReturn}
     */
    public static async save(speciesId: number, buffer?: Buffer): Promise<DefaultReturn> {
        if (!Number.isInteger(speciesId) || speciesId <= 0 || !buffer || buffer.length === 0) {
            return {
                statusCode: StatusCodes.INTERNAL_ERROR,
                msg: 'Request incomplete'
            };
        }

        if (buffer.length > Image.MAX_SIZE) {
            return {
                statusCode: StatusCodes.INTERNAL_ERROR,
                msg: 'Image is too large (max. 5 MB)'
            };
        }

        const format = Image.detectFormat(buffer);

        if (format === null) {
            return {
                statusCode: StatusCodes.INTERNAL_ERROR,
                msg: 'Unsupported image format (PNG, JPEG, GIF or WebP)'
            };
        }

        const species = await SpeciesRepository.getInstance().findOne(speciesId);

        if (!species) {
            return {
                statusCode: StatusCodes.INTERNAL_ERROR,
                msg: 'Specie not found in the database'
            };
        }

        const dir = await UtilUploadPath.getSpeciesDirectory();

        if (dir === null) {
            return {
                statusCode: StatusCodes.INTERNAL_ERROR,
                msg: 'Data directory is not configured'
            };
        }

        const filename = `species-${species.id}-${Date.now()}.${format.ext}`;
        await fs.promises.writeFile(Path.join(dir, filename), buffer);

        const old = species.image;
        species.image = filename;
        await SpeciesRepository.getInstance().save(species);

        await Image.removeFile(old);

        return {
            statusCode: StatusCodes.OK
        };
    }

    /**
     * Remove the image of a species (falls back to the built-in silhouette).
     * Caller must verify admin role.
     * @param {SpeciesDeleteRequest} request
     * @return {DefaultReturn}
     */
    public static async remove(request?: SpeciesDeleteRequest): Promise<DefaultReturn> {
        if (!request) {
            return {
                statusCode: StatusCodes.INTERNAL_ERROR,
                msg: 'Request incomplete'
            };
        }

        const species = await SpeciesRepository.getInstance().findOne(request.id);

        if (!species) {
            return {
                statusCode: StatusCodes.INTERNAL_ERROR,
                msg: 'Specie not found in the database'
            };
        }

        const old = species.image;

        if (old !== '') {
            species.image = '';
            await SpeciesRepository.getInstance().save(species);
            await Image.removeFile(old);
        }

        return {
            statusCode: StatusCodes.OK
        };
    }

    /**
     * Delete an image file from the species directory (ignores missing files).
     * @param {string} filename
     */
    public static async removeFile(filename: string): Promise<void> {
        const safeName = UtilSafePath.safeSegment(filename);
        const dir = await UtilUploadPath.getSpeciesDirectory();

        if (safeName === null || dir === null) {
            return;
        }

        try {
            await fs.promises.unlink(Path.join(dir, safeName));
        } catch (e) {
            if ((e as NodeJS.ErrnoException).code !== 'ENOENT') {
                Logger.getLogger().warn(`Main/Species::Image: could not remove ${safeName}: ${(e as Error).message}`);
            }
        }
    }

    /**
     * Stream the species image. Only the file currently set on the species is
     * served (404 otherwise), with its image mime type and nosniff.
     * @param {SpeciesImageGetRequest} request
     * @param {Response} response
     */
    public static async serve(request: SpeciesImageGetRequest, response: Response): Promise<void> {
        const species = await SpeciesRepository.getInstance().findOne(request.id);
        const safeName = UtilSafePath.safeSegment(request.filename);

        if (!species || safeName === null || species.image === '' || species.image !== safeName) {
            response.status(404).send('File not found');
            return;
        }

        const dir = await UtilUploadPath.getSpeciesDirectory();

        if (dir === null) {
            response.status(404).send('File not found');
            return;
        }

        const filePath = Path.join(dir, safeName);

        if (!await FileHelper.fileExist(filePath)) {
            response.status(404).send('File not found');
            return;
        }

        // file names are unique per upload → safe to cache for long
        response.setHeader('Cache-Control', 'private, max-age=604800, immutable');
        response.setHeader('X-Content-Type-Options', 'nosniff');

        if (!HttpFileStream.responseFile(filePath, Image.mimeOf(safeName), response)) {
            response.status(500).send('Stream error');
        }
    }

}