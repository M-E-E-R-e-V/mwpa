import {
    ExternalTourSourceDeleteRequest,
    ExternalTourSourceEntry,
    ExternalTourSourceListResponse
} from 'mwpa_schemas';
import {NetFetch} from '../Net/NetFetch';
import {UnauthorizedError} from './Error/UnauthorizedError';
import {StatusCodes} from './Status/StatusCodes';

/*
 * Schema-typed re-exports — the frontend never hand-writes these
 * shapes, so a server-side schema change (added field, renamed key)
 * surfaces as a TypeScript error in the consumer page rather than a
 * silent data drift at runtime.
 */
export type {
    ExternalTourSourceDeleteRequest,
    ExternalTourSourceEntry,
    ExternalTourSourceListResponse
};

/**
 * Admin CRUD for the per-organisation external-tour-source config.
 * All endpoints are admin-gated server-side; non-admins receive 403.
 */
export class ExternalTourSource {

    public static async getList(): Promise<ExternalTourSourceEntry[]> {
        const result = await NetFetch.postData('/json/external-tour-source/list', {});

        if (result && result.statusCode) {
            switch (result.statusCode) {
                case StatusCodes.OK:
                    return ((result as ExternalTourSourceListResponse).list) ?? [];

                case StatusCodes.UNAUTHORIZED:
                    throw new UnauthorizedError();
            }
        }

        return [];
    }

    /**
     * Create (id=0) or update one source. Returns true when the
     * server reports OK.
     */
    public static async save(entry: ExternalTourSourceEntry): Promise<boolean> {
        const result = await NetFetch.postData('/json/external-tour-source/save', entry);

        if (result && result.statusCode) {
            switch (result.statusCode) {
                case StatusCodes.OK:
                    return true;

                case StatusCodes.UNAUTHORIZED:
                    throw new UnauthorizedError();
            }
        }

        return false;
    }

    public static async delete(req: ExternalTourSourceDeleteRequest): Promise<boolean> {
        const result = await NetFetch.postData('/json/external-tour-source/delete', req);

        if (result && result.statusCode) {
            switch (result.statusCode) {
                case StatusCodes.OK:
                    return true;

                case StatusCodes.UNAUTHORIZED:
                    throw new UnauthorizedError();
            }
        }

        return false;
    }

}