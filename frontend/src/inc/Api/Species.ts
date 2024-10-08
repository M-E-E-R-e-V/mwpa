import {NetFetch} from '../Net/NetFetch';
import {UnauthorizedError} from './Error/UnauthorizedError';
import {StatusCodes} from './Status/StatusCodes';
import {DefaultReturn} from './Types/DefaultReturn';

/**
 * Species entry group
 */
export type SpeciesEntryGroup = {
    name: string;
    color: string;
};

/**
 * SpeciesEntry
 */
export type SpeciesEntry = {
    id: number;
    name: string;
    ottid: number;
    isdeleted?: boolean;
    species_groupid: number;
    species_group?: SpeciesEntryGroup;
};

/**
 * SpeciesListResponse
 */
export type SpeciesListResponse = DefaultReturn & {
    list: SpeciesEntry[];
};

/**
 * SpeciesMerge
 */
export type SpeciesMerge = {
    source_id: number;
    destination_id: number;
};

/**
 * SpeciesDelete
 */
export type SpeciesDelete = {
    id: number;
};

/**
 * Species
 */
export class Species {

    /**
     * getList
     */
    public static async getList(): Promise<null|SpeciesEntry[]> {
        const result = await NetFetch.getData('/json/species/list');

        if (result && result.statusCode) {
            switch (result.statusCode) {
                case StatusCodes.OK:
                    // eslint-disable-next-line no-case-declarations
                    const response = result as SpeciesListResponse;
                    return response.list;

                case StatusCodes.UNAUTHORIZED:
                    throw new UnauthorizedError();
            }
        }

        return null;
    }

    /**
     * save
     * @param specie
     */
    public static async save(specie: SpeciesEntry): Promise<boolean> {
        const result = await NetFetch.postData('/json/species/save', specie);

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
     * merge
     * @param merge
     */
    public static async merge(merge: SpeciesMerge): Promise<boolean> {
        const result = await NetFetch.postData('/json/species/merge', merge);

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
     * delete
     * @param sdelete
     */
    public static async delete(sdelete: SpeciesDelete): Promise<boolean> {
        const result = await NetFetch.postData('/json/species/delete', sdelete);

        if (result && result.statusCode) {
            switch (result.statusCode) {
                case StatusCodes.OK:
                    return true;

                case StatusCodes.UNAUTHORIZED:
                    throw new UnauthorizedError();

                default:
                    if (result.msg) {
                        throw Error(result.msg);
                    }
            }
        }

        return false;
    }

}