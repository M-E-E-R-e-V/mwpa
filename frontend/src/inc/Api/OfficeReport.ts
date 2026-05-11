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
 * UsedVehicleEntry — vehicle that has at least one sighting in the
 * year/semester/organization range the picker is showing.
 */
export type UsedVehicleEntry = {
    id: number;
    name: string;
    isdeleted?: boolean;
};

/**
 * UsedVehicleListResponse
 */
export type UsedVehicleListResponse = DefaultReturn & {
    list?: UsedVehicleEntry[];
};

/**
 * Filter forwarded to `/json/officereport/used_vehicles`. Mirrors the AROC
 * picker state — empty fields are dropped before the request goes out.
 */
export type UsedVehiclesFilter = {
    year?: number;
    semester?: 1 | 2;
    organizationId?: number;
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

    /**
     * Vehicles that have at least one non-deleted sighting in the given
     * year/semester/organization range. Used by the AROC boat picker so the
     * dropdown only lists boats the user can actually report on for that
     * period. Empty filter returns every vehicle with any sighting.
     */
    public static async getUsedVehicles(filter: UsedVehiclesFilter = {}): Promise<UsedVehicleEntry[]> {
        const params = new URLSearchParams();
        if (filter.year !== undefined && filter.year > 0) {
            params.set('year', `${filter.year}`);
        }
        if (filter.semester === 1 || filter.semester === 2) {
            params.set('semester', `${filter.semester}`);
        }
        if (filter.organizationId !== undefined && filter.organizationId > 0) {
            params.set('organization_id', `${filter.organizationId}`);
        }

        const query = params.toString();
        const url = query === ''
            ? '/json/officereport/used_vehicles'
            : `/json/officereport/used_vehicles?${query}`;

        const result = await NetFetch.getData(url);

        if (result && result.statusCode) {
            switch (result.statusCode) {
                case StatusCodes.OK:
                    return ((result as UsedVehicleListResponse).list) ?? [];

                case StatusCodes.UNAUTHORIZED:
                    throw new UnauthorizedError();
            }
        }

        return [];
    }

}