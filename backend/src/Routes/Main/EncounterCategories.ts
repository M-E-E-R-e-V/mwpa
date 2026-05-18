import {Router} from 'express';
import {DefaultRoute} from 'figtree';
import {DefaultReturn, SchemaDefaultReturn, StatusCodes} from 'figtree-schemas';
import {
    EncounterCategorieEntry,
    SchemaEncounterCategorieDeleteRequest,
    SchemaEncounterCategorieEntry,
    SchemaEncounterCategoriesResponse,
    SchemaMWPASessionData
} from 'mwpa_schemas';
import {checkMWPAUserIsLogin} from '../AuthCheck.js';
import {defaultMWPASessionInit} from '../SessionDefault.js';
import {Delete} from './EncounterCategories/Delete.js';
import {List} from './EncounterCategories/List.js';
import {Save} from './EncounterCategories/Save.js';

/**
 * Encounter categories
 */
export class EncounterCategories extends DefaultRoute {

    /**
     * Return the express router
     * @returns {Router}
     */
    public getExpressRouter(): Router {
        this._get(
            '/json/encountercategories/list',
            checkMWPAUserIsLogin,
            async() => List.getList(),
            {
                description: 'List of encounter categories (including soft-deleted).',
                responseBodySchema: SchemaEncounterCategoriesResponse,
                sessionSchema: SchemaMWPASessionData,
                sessionInit: defaultMWPASessionInit
            }
        );

        this._post(
            '/json/encountercategories/save',
            checkMWPAUserIsLogin,
            async(_req, _res, data): Promise<DefaultReturn> => {
                if (!data.session?.user?.isAdmin) {
                    return {statusCode: StatusCodes.FORBIDDEN};
                }
                return Save.save(data.body as EncounterCategorieEntry);
            },
            {
                description: 'Create or update one encounter category (admin only). id=0 inserts.',
                bodySchema: SchemaEncounterCategorieEntry,
                responseBodySchema: SchemaDefaultReturn,
                sessionSchema: SchemaMWPASessionData,
                sessionInit: defaultMWPASessionInit
            }
        );

        this._post(
            '/json/encountercategories/delete',
            checkMWPAUserIsLogin,
            async(_req, _res, data): Promise<DefaultReturn> => {
                if (!data.session?.user?.isAdmin) {
                    return {statusCode: StatusCodes.FORBIDDEN};
                }
                return Delete.delete(data.body!);
            },
            {
                description: 'Soft-delete one encounter category (admin only).',
                bodySchema: SchemaEncounterCategorieDeleteRequest,
                responseBodySchema: SchemaDefaultReturn,
                sessionSchema: SchemaMWPASessionData,
                sessionInit: defaultMWPASessionInit
            }
        );

        return super.getExpressRouter();
    }

}