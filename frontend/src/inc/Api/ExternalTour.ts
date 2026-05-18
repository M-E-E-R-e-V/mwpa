import {
    ExternalTourEntry,
    ExternalTourListRequest,
    ExternalTourListResponse
} from 'mwpa_schemas';
import {NetFetch} from '../Net/NetFetch';
import {UnauthorizedError} from './Error/UnauthorizedError';
import {StatusCodes} from './Status/StatusCodes';

export type {
    ExternalTourEntry,
    ExternalTourListRequest,
    ExternalTourListResponse
};

/**
 * Read-only access to the pulled external_tour rows. Non-admins are
 * server-side scoped to the orgs they belong to.
 */
export class ExternalTour {

    public static async getList(req?: ExternalTourListRequest): Promise<ExternalTourEntry[]> {
        const result = await NetFetch.postData('/json/external-tour/list', req ?? {});

        if (result && result.statusCode) {
            switch (result.statusCode) {
                case StatusCodes.OK:
                    return ((result as ExternalTourListResponse).list) ?? [];

                case StatusCodes.UNAUTHORIZED:
                    throw new UnauthorizedError();
            }
        }

        return [];
    }

}