import {ProtectedAreaData, ProtectedAreaResponse} from 'mwpa_schemas';
import {NetFetch} from '../Net/NetFetch';
import {UnauthorizedError} from './Error/UnauthorizedError';
import {StatusCodes} from './Status/StatusCodes';

/**
 * Protected areas (EEA Natura 2000) around the home area of the user's
 * organization. The backend loads them in the background on first request
 * — until then `status` is 'pending'.
 */
export class ProtectedArea {

    public static async get(): Promise<ProtectedAreaData | null> {
        const result = await NetFetch.getData('/json/protectedarea/list') as ProtectedAreaResponse | null;

        if (result?.statusCode === StatusCodes.UNAUTHORIZED) {
            throw new UnauthorizedError();
        }

        if (result?.statusCode === StatusCodes.OK) {
            return result.data ?? null;
        }

        return null;
    }

}