import {Router} from 'express';
import {DefaultRoute} from '@stefanwerfling/figtree';
import {DefaultReturn, SchemaDefaultReturn} from 'figtree-schemas';
import {
    RightUser,
    SchemaMWPASessionData,
    SchemaTableFilterDeleteRequest,
    SchemaTableFilterEntry,
    SchemaTableFilterListRequest,
    SchemaTableFilterListResponse,
    SchemaTableFilterSaveResponse,
    TableFilterListResponse,
    TableFilterSaveResponse
} from 'mwpa_schemas';
import {checkMWPAUserIsLoginACL} from '../AuthCheck.js';
import {defaultMWPASessionInit} from '../SessionDefault.js';
import {TableFilterHandler} from './TableFilter/TableFilterHandler.js';

/**
 * TableFilter — private, named list filter presets of the session user
 * (side-menu entries below e.g. the sighting list).
 */
export class TableFilter extends DefaultRoute {

    /**
     * Return the express router
     * @returns {Router}
     */
    public getExpressRouter(): Router {
        this._post(
            '/json/user/tablefilter/list',
            checkMWPAUserIsLoginACL,
            async(_req, _res, data): Promise<TableFilterListResponse> => TableFilterHandler.getList(
                data.session?.user?.userid ?? 0,
                data.body
            ),
            {
                description: 'List the session user\'s saved list filter presets (optionally of one table).',
                aclRight: RightUser.user_read,
                bodySchema: SchemaTableFilterListRequest,
                responseBodySchema: SchemaTableFilterListResponse,
                sessionSchema: SchemaMWPASessionData,
                sessionInit: defaultMWPASessionInit
            }
        );

        this._post(
            '/json/user/tablefilter/save',
            checkMWPAUserIsLoginACL,
            async(_req, _res, data): Promise<TableFilterSaveResponse> => TableFilterHandler.save(
                data.session?.user?.userid ?? 0,
                data.body
            ),
            {
                description: 'Create (empty unid) or update a saved list filter preset of the session user.',
                aclRight: RightUser.user_write,
                bodySchema: SchemaTableFilterEntry,
                responseBodySchema: SchemaTableFilterSaveResponse,
                sessionSchema: SchemaMWPASessionData,
                sessionInit: defaultMWPASessionInit
            }
        );

        this._post(
            '/json/user/tablefilter/delete',
            checkMWPAUserIsLoginACL,
            async(_req, _res, data): Promise<DefaultReturn> => TableFilterHandler.delete(
                data.session?.user?.userid ?? 0,
                data.body
            ),
            {
                description: 'Delete a saved list filter preset of the session user.',
                aclRight: RightUser.user_write,
                bodySchema: SchemaTableFilterDeleteRequest,
                responseBodySchema: SchemaDefaultReturn,
                sessionSchema: SchemaMWPASessionData,
                sessionInit: defaultMWPASessionInit
            }
        );

        return super.getExpressRouter();
    }

}