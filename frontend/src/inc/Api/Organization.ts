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

}