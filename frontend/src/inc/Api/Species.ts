import {
    SpeciesDeleteRequest,
    SpeciesEntry,
    SpeciesEntryGroup,
    SpeciesListResponse,
    SpeciesMergeRequest
} from 'mwpa_schemas';
import {NetFetch} from '../Net/NetFetch';
import {UnauthorizedError} from './Error/UnauthorizedError';
import {StatusCodes} from './Status/StatusCodes';

/*
 * Schema-typed re-exports. The legacy names (SpeciesMerge,
 * SpeciesDelete) stay as aliases so existing call sites compile
 * unchanged after the port from hand-written types.
 */
export type {
    SpeciesEntry,
    SpeciesEntryGroup,
    SpeciesListResponse,
    SpeciesMergeRequest,
    SpeciesDeleteRequest
};

export type SpeciesMerge = SpeciesMergeRequest;
export type SpeciesDelete = SpeciesDeleteRequest;

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
                    return (result as SpeciesListResponse).list;

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
    public static async merge(merge: SpeciesMergeRequest): Promise<boolean> {
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
    public static async delete(sdelete: SpeciesDeleteRequest): Promise<boolean> {
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