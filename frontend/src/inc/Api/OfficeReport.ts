import {NetFetch} from '../Net/NetFetch';
import {UnauthorizedError} from './Error/UnauthorizedError';
import {StatusCodes} from './Status/StatusCodes';
import {DefaultReturn} from './Types/DefaultReturn';

/**
 * ExternalReceiverEntry
 */
export type ExternalReceiverEntry = {
    id: number;
    name: string;
};

/**
 * ExternalReceiverListResponse
 */
export type ExternalReceiverListResponse = DefaultReturn & {
    list?: ExternalReceiverEntry[];
};

/**
 * OfficeReport API helper.
 */
export class OfficeReport {

    /**
     * Available external receivers — feeds the AROC-report receiver dropdown.
     * Returns an empty array on any non-OK response (UNAUTHORIZED still throws).
     */
    public static async getReceivers(): Promise<ExternalReceiverEntry[]> {
        const result = await NetFetch.getData('/json/officereport/receivers');

        if (result && result.statusCode) {
            switch (result.statusCode) {
                case StatusCodes.OK:
                    return ((result as ExternalReceiverListResponse).list) ?? [];

                case StatusCodes.UNAUTHORIZED:
                    throw new UnauthorizedError();
            }
        }

        return [];
    }

}