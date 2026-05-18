import {Router} from 'express';
import {DefaultRoute} from 'figtree';
import {DefaultReturn, SchemaDefaultReturn, StatusCodes} from 'figtree-schemas';
import {
    ExternalTourListResponse,
    ExternalTourSourceEntry,
    ExternalTourSourceListResponse,
    SchemaExternalTourListRequest,
    SchemaExternalTourListResponse,
    SchemaExternalTourSourceDeleteRequest,
    SchemaExternalTourSourceEntry,
    SchemaExternalTourSourceListResponse,
    SchemaMWPASessionData
} from 'mwpa_schemas';
import {checkMWPAUserIsLogin} from '../AuthCheck.js';
import {defaultMWPASessionInit} from '../SessionDefault.js';
import {SourceDelete} from './ExternalTour/SourceDelete.js';
import {SourceList} from './ExternalTour/SourceList.js';
import {SourceSave} from './ExternalTour/SourceSave.js';
import {TourList} from './ExternalTour/TourList.js';

/**
 * Routes for the external-tour-source admin CRUD + the read-only
 * scheduled-tour list. Source mutations are admin-only; the read
 * endpoint is scoped to the caller's organisations for non-admins.
 */
export class ExternalTour extends DefaultRoute {

    public getExpressRouter(): Router {

        this._post(
            '/json/external-tour-source/list',
            checkMWPAUserIsLogin,
            async(_req, _res, data): Promise<ExternalTourSourceListResponse> => {
                if (!data.session?.user?.isAdmin) {
                    return {statusCode: StatusCodes.FORBIDDEN, list: []};
                }
                return SourceList.list();
            },
            {
                description: 'List external tour-source configs (admin only).',
                responseBodySchema: SchemaExternalTourSourceListResponse,
                sessionSchema: SchemaMWPASessionData,
                sessionInit: defaultMWPASessionInit
            }
        );

        this._post(
            '/json/external-tour-source/save',
            checkMWPAUserIsLogin,
            async(_req, _res, data): Promise<DefaultReturn> => {
                if (!data.session?.user?.isAdmin) {
                    return {statusCode: StatusCodes.FORBIDDEN};
                }
                return SourceSave.save(data.body as ExternalTourSourceEntry);
            },
            {
                description: 'Create or update an external tour-source config (admin only). id=0 inserts.',
                bodySchema: SchemaExternalTourSourceEntry,
                responseBodySchema: SchemaDefaultReturn,
                sessionSchema: SchemaMWPASessionData,
                sessionInit: defaultMWPASessionInit
            }
        );

        this._post(
            '/json/external-tour-source/delete',
            checkMWPAUserIsLogin,
            async(_req, _res, data): Promise<DefaultReturn> => {
                if (!data.session?.user?.isAdmin) {
                    return {statusCode: StatusCodes.FORBIDDEN};
                }
                return SourceDelete.delete(data.body!);
            },
            {
                description: 'Delete one external tour-source config (admin only).',
                bodySchema: SchemaExternalTourSourceDeleteRequest,
                responseBodySchema: SchemaDefaultReturn,
                sessionSchema: SchemaMWPASessionData,
                sessionInit: defaultMWPASessionInit
            }
        );

        this._post(
            '/json/external-tour/list',
            checkMWPAUserIsLogin,
            async(_req, _res, data): Promise<ExternalTourListResponse> => {
                const userId = data.session?.user?.userid ?? 0;
                const isAdmin = data.session?.user?.isAdmin ?? false;
                return TourList.list(userId, isAdmin, data.body ?? {});
            },
            {
                description: 'Planned tour slots pulled from external booking providers, scoped to the caller\'s organisations for non-admins. Default window: now → now+60 days.',
                bodySchema: SchemaExternalTourListRequest,
                responseBodySchema: SchemaExternalTourListResponse,
                sessionSchema: SchemaMWPASessionData,
                sessionInit: defaultMWPASessionInit
            }
        );

        return super.getExpressRouter();
    }

}