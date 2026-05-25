import {
    SpeciesDeleteRequest,
    SpeciesEntry,
    SpeciesEntryGroup,
    SpeciesListResponse,
    SpeciesMergeRequest,
    SpeciesProfile as SpeciesProfileData,
    SpeciesProfileBucket,
    SpeciesProfileCategoryShare,
    SpeciesProfileEnv,
    SpeciesProfileGroupRatios,
    SpeciesProfileHeadingBin,
    SpeciesProfileHeatmapPoint,
    SpeciesProfileHourly,
    SpeciesProfileMonthly,
    SpeciesProfileMovement,
    SpeciesProfileResponse
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
    SpeciesDeleteRequest,
    SpeciesProfileData,
    SpeciesProfileBucket,
    SpeciesProfileCategoryShare,
    SpeciesProfileEnv,
    SpeciesProfileGroupRatios,
    SpeciesProfileHeadingBin,
    SpeciesProfileHeatmapPoint,
    SpeciesProfileHourly,
    SpeciesProfileMonthly,
    SpeciesProfileMovement,
    SpeciesProfileResponse
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
     * Fetch the per-species profile (counts, group-size histogram, env
     * distributions). Period bounds are optional — omit for the full
     * data range.
     */
    public static async getProfile(speciesId: number, periodFrom?: string, periodTo?: string): Promise<SpeciesProfileData | null> {
        const body: {species_id: number; period_from?: string; period_to?: string;} = {species_id: speciesId};
        if (periodFrom) {
            body.period_from = periodFrom;
        }
        if (periodTo) {
            body.period_to = periodTo;
        }
        const result = await NetFetch.postData('/json/species/profile', body) as SpeciesProfileResponse;

        if (result && result.statusCode === StatusCodes.UNAUTHORIZED) {
            throw new UnauthorizedError();
        }

        if (result && result.statusCode === StatusCodes.OK && result.profile) {
            return result.profile;
        }

        return null;
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