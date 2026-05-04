import {Router} from 'express';
import {DefaultRoute} from 'figtree';
import multer from 'multer';
import {
    DefaultMobileV1Return,
    SchemaDefaultMobileV1Return,
    SchemaMWPASessionData,
    SchemaSightingImageExistRequest,
    SchemaSightingImageExistResponse,
    SchemaSightingSaveResponse,
    SchemaTypeSighting,
    SightingImageExistResponse,
    SightingSaveResponse
} from 'mwpa_schemas';
import {checkMWPAUserIsLogin} from '../AuthCheck.js';
import {defaultMWPASessionInit} from '../SessionDefault.js';
import {ImageExist} from './Sightings/ImageExist.js';
import {ImageSave} from './Sightings/ImageSave.js';
import {Save} from './Sightings/Save.js';
import {MobileV1StatusCode} from './MobileV1.js';

const imageUpload = multer({storage: multer.memoryStorage()});

/**
 * Mobile/Sightings
 */
export class Sightings extends DefaultRoute {

    /**
     * Return the express router
     * @returns {Router}
     */
    public getExpressRouter(): Router {

        this._post(
            '/mobile/sighting/save',
            checkMWPAUserIsLogin,
            async(_req, _res, data): Promise<SightingSaveResponse> => {
                const sessionUser = data.session?.user;
                if (!sessionUser?.isMobileLogin || !sessionUser.deviceIdentity) {
                    return {
                        statusCode: MobileV1StatusCode.UNAUTHORIZED
                    };
                }
                return Save.save(
                    sessionUser.deviceIdentity,
                    sessionUser.userid,
                    sessionUser.main_organization_id,
                    data.body
                );
            },
            {
                description: 'Mobile sighting upsert (creates parent tour, dedupes via hash + unid).',
                bodySchema: SchemaTypeSighting,
                responseBodySchema: SchemaSightingSaveResponse,
                sessionSchema: SchemaMWPASessionData,
                sessionInit: defaultMWPASessionInit,
            }
        );

        this._post(
            '/mobile/sighting/image/exist',
            checkMWPAUserIsLogin,
            async(_req, _res, data): Promise<SightingImageExistResponse> => {
                const sessionUser = data.session?.user;
                if (!sessionUser?.isMobileLogin || !sessionUser.deviceIdentity) {
                    return {
                        statusCode: MobileV1StatusCode.UNAUTHORIZED
                    };
                }
                return ImageExist.check(sessionUser.deviceIdentity, data.body);
            },
            {
                description: 'Check whether a sighting image already exists on the server.',
                bodySchema: SchemaSightingImageExistRequest,
                responseBodySchema: SchemaSightingImageExistResponse,
                sessionSchema: SchemaMWPASessionData,
                sessionInit: defaultMWPASessionInit,
            }
        );

        this._post(
            '/mobile/sighting/image/save',
            checkMWPAUserIsLogin,
            async(req, _res, data): Promise<DefaultMobileV1Return> => {
                const sessionUser = data.session?.user;
                if (!sessionUser?.isMobileLogin || !sessionUser.deviceIdentity) {
                    return {
                        statusCode: MobileV1StatusCode.UNAUTHORIZED
                    };
                }

                // multipart parser is expected to attach `req.file` (multer) and the rest as body fields.
                const file = (req as unknown as {file?: {buffer: Buffer}}).file;
                const body = (req.body ?? {}) as {unid?: string; filename?: string; size?: string};

                return ImageSave.save(sessionUser.deviceIdentity, {
                    file,
                    unid: body.unid,
                    filename: body.filename,
                    size: body.size
                });
            },
            {
                description: 'Upload a sighting image (multipart form-data with field "file" plus body fields unid/filename/size).',
                responseBodySchema: SchemaDefaultMobileV1Return,
                sessionSchema: SchemaMWPASessionData,
                sessionInit: defaultMWPASessionInit,
                parser: imageUpload.single('file')
            }
        );

        return super.getExpressRouter();
    }

}
