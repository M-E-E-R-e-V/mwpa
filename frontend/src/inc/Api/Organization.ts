import {NetFetch} from '../Net/NetFetch';
import {UnauthorizedError} from './Error/UnauthorizedError';
import {StatusCodes} from './Status/StatusCodes';
import {DefaultReturn} from './Types/DefaultReturn';

/**
 * OrganizationEntry
 */
export type OrganizationEntry = {
    id: number;
    description: string;
};

/**
 * OrganizationUserListResponse
 */
export type OrganizationUserListResponse = DefaultReturn & {
    list?: OrganizationEntry[];
};

/**
 * OrganizationFullEntry
 */
export type OrganizationFullEntry = OrganizationEntry & {
    location: string;
    lat: string;
    lon: string;
    country: string;
};

/**
 * OrganizationListResponse
 */
export type OrganizationListResponse = DefaultReturn & {
    list?: OrganizationFullEntry[];
};

export type OrganizationTrackingAreaOrgAndType = {
    organization_id: number;
    area_type: string;
};

/**
 * OrganizationTrackingAreaRequest
 */
export type OrganizationTrackingAreaRequest = {
    id?: number;
    organization?: OrganizationTrackingAreaOrgAndType;
};

/**
 * Organization tracking area entry
 */
export type OrganizationTrackingAreaEntry = {
    id: number;
    organization_id: number;
    area_type: string;
    geojsonstr: string;
};

/**
 * OrganizationTrackingAreaRespose
 */
export type OrganizationTrackingAreaRespose = DefaultReturn & {
    data?: OrganizationTrackingAreaEntry;
};

/**
 * Area Types
 */
export enum TrackingAreaType {
    HOME = 'home'
}

/**
 * Organization
 */
export class Organization {

    /**
     * getOrganizationByUser
     */
    public static async getOrganizationByUser(): Promise<OrganizationEntry[] | null> {
        const result = await NetFetch.getData('/json/organization/userlist');

        if (result && result.statusCode) {
            const tresult = result as OrganizationUserListResponse;

            switch (tresult.statusCode) {
                case StatusCodes.OK:
                    if (tresult.list) {
                        return tresult.list;
                    }

                    throw new Error('Grouplist is empty return!');

                case StatusCodes.UNAUTHORIZED:
                    throw new UnauthorizedError();
            }
        }

        return null;
    }

    /**
     * getOrganization
     */
    public static async getOrganization(): Promise<OrganizationFullEntry[] | null> {
        const result = await NetFetch.getData('/json/organization/list');

        if (result && result.statusCode) {
            const tresult = result as OrganizationListResponse;

            switch (tresult.statusCode) {
                case StatusCodes.OK:
                    if (tresult.list) {
                        return tresult.list;
                    }

                    throw new Error('Grouplist is empty return!');

                case StatusCodes.UNAUTHORIZED:
                    throw new UnauthorizedError();
            }
        }

        return null;
    }

    public static async saveOrganization(org: OrganizationFullEntry): Promise<boolean> {
        const result = await NetFetch.postData('/json/organization/save', org);

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

    /**
     * getOrganizationTrackingArea
     * @param {OrganizationTrackingAreaOrgAndType} org
     * @param {id} id
     */
    public static async getOrganizationTrackingArea(org?: OrganizationTrackingAreaOrgAndType, id?: number): Promise<OrganizationTrackingAreaEntry | null> {
        let result: any|undefined;

        if (id) {
            result = await NetFetch.postData('/json/organization/trackingarea/list', {
                id
            });
        } else if (org) {
            result = await NetFetch.postData('/json/organization/trackingarea/list', {
                organization: org
            });
        }

        if (result && result.statusCode) {
            const tresult = result as OrganizationTrackingAreaRespose;

            switch (tresult.statusCode) {
                case StatusCodes.OK:
                    if (tresult.data) {
                        return tresult.data;
                    }
                    break;

                case StatusCodes.UNAUTHORIZED:
                    throw new UnauthorizedError();
            }
        }

        return null;
    }

    /**
     * Save organization tracking area
     * @param {OrganizationTrackingAreaEntry} org
     */
    public static async saveOrganizationTrackingArea(org: OrganizationTrackingAreaEntry): Promise<boolean> {
        const result = await NetFetch.postData('/json/organization/trackingarea/save', org);

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