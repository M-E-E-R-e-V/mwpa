import {
    EncounterCategorieDeleteRequest,
    EncounterCategorieEntry,
    EncounterCategoriesResponse
} from 'mwpa_schemas';
import {NetFetch} from '../Net/NetFetch';
import {UnauthorizedError} from './Error/UnauthorizedError';
import {StatusCodes} from './Status/StatusCodes';

export type {
    EncounterCategorieDeleteRequest,
    EncounterCategorieEntry,
    EncounterCategoriesResponse
};

/**
 * EncounterCategories — admin CRUD for the picker behind a sighting's
 * "reaction" field. Lists include soft-deleted rows so admins can
 * revive them; non-admins receive 403 on save/delete.
 */
export class EncounterCategories {

    public static async getList(): Promise<EncounterCategorieEntry[]> {
        const result = await NetFetch.getData('/json/encountercategories/list');

        if (result && result.statusCode) {
            switch (result.statusCode) {
                case StatusCodes.OK:
                    return (result as EncounterCategoriesResponse).list ?? [];

                case StatusCodes.UNAUTHORIZED:
                    throw new UnauthorizedError();
            }
        }

        return [];
    }

    public static async save(entry: EncounterCategorieEntry): Promise<boolean> {
        const result = await NetFetch.postData('/json/encountercategories/save', entry);

        if (result && result.statusCode) {
            switch (result.statusCode) {
                case StatusCodes.OK:
                    return true;

                case StatusCodes.UNAUTHORIZED:
                    throw new UnauthorizedError();

                default:
                    if (result.msg) {
                        throw new Error(result.msg);
                    }
            }
        }

        return false;
    }

    public static async delete(req: EncounterCategorieDeleteRequest): Promise<boolean> {
        const result = await NetFetch.postData('/json/encountercategories/delete', req);

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