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
    SpeciesProfileEnvExtra,
    SpeciesProfileGroupRatios,
    SpeciesProfileHeadingBin,
    SpeciesProfileHeatmapPoint,
    SpeciesProfileHourly,
    SpeciesProfileMonthly,
    SpeciesProfileMonthlyEffort,
    SpeciesProfileIcc,
    SpeciesProfileMovement,
    SpeciesProfilePressure,
    SpeciesProfileResponse,
    SpeciesProfileSeismic,
    SpeciesProfileSpatial,
    SpeciesProfileSpatialCell,
    SpeciesProfileResponseBin,
    SpeciesProfileEnvResponse,
    SpeciesProfilePhenologyBin,
    SpeciesProfileTrendPoint,
    SpeciesProfilePhenology,
    SpeciesProfileBehaviourLink,
    SpeciesProfileBehaviourCooccurrence,
    SpeciesProfileYearly,
    SpeciesRegressionChart,
    SpeciesRegressionFit,
    SpeciesRegressionMatrixResponse,
    SpeciesRegressionPoint,
    SpeciesRegressionSeries
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
    SpeciesProfileEnvExtra,
    SpeciesProfileGroupRatios,
    SpeciesProfileHeadingBin,
    SpeciesProfileHeatmapPoint,
    SpeciesProfileHourly,
    SpeciesProfileMonthly,
    SpeciesProfileMonthlyEffort,
    SpeciesProfileIcc,
    SpeciesProfileMovement,
    SpeciesProfilePressure,
    SpeciesProfileResponse,
    SpeciesProfileSeismic,
    SpeciesProfileSpatial,
    SpeciesProfileSpatialCell,
    SpeciesProfileResponseBin,
    SpeciesProfileEnvResponse,
    SpeciesProfilePhenologyBin,
    SpeciesProfileTrendPoint,
    SpeciesProfilePhenology,
    SpeciesProfileBehaviourLink,
    SpeciesProfileBehaviourCooccurrence,
    SpeciesProfileYearly,
    SpeciesRegressionChart,
    SpeciesRegressionFit,
    SpeciesRegressionMatrixResponse,
    SpeciesRegressionPoint,
    SpeciesRegressionSeries
};

export type SpeciesMerge = SpeciesMergeRequest;
export type SpeciesDelete = SpeciesDeleteRequest;

/**
 * Species
 */
export class Species {

    /**
     * getList
     * @param {boolean} [lookup] true = read-only lookup route for the sighting/tour/analytics pages
     *   (needs sightings_read, tours_read, analytics_read or external_tours_read instead of the master-data read right).
     */
    public static async getList(lookup: boolean = false): Promise<null|SpeciesEntry[]> {
        const result = await NetFetch.getData(lookup ? '/json/lookup/species' : '/json/species/list');

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
     * Url of the uploaded image of a species, or null when it has none
     * (callers then fall back to the built-in silhouette).
     * @param {SpeciesEntry} specie
     * @return {string|null}
     */
    public static imageUrl(specie: SpeciesEntry | undefined): string | null {
        if (!specie?.image) {
            return null;
        }

        return `/json/species/image/${specie.id}/${encodeURIComponent(specie.image)}`;
    }

    /**
     * Upload (and replace) the image of a species.
     * @param {number} id species id
     * @param {File} file PNG/JPEG/GIF/WebP, max. 5 MB
     * @return {Promise<string|null>} null on success, otherwise the error message
     */
    public static async uploadImage(id: number, file: File): Promise<string | null> {
        const form = new FormData();
        form.append('id', `${id}`);
        form.append('file', file);

        const response = await fetch('/json/species/image/upload', {
            method: 'POST',
            cache: 'no-cache',
            credentials: 'same-origin',
            body: form
        });

        if (response.status === 401) {
            throw new UnauthorizedError();
        }

        let result: {statusCode?: string; msg?: string;} | null = null;

        try {
            result = await response.json() as {statusCode?: string; msg?: string;};
        } catch {
            result = null;
        }

        if (result?.statusCode === StatusCodes.OK) {
            return null;
        }

        if (result?.statusCode === StatusCodes.UNAUTHORIZED) {
            throw new UnauthorizedError();
        }

        return result?.msg ?? `HTTP ${response.status}`;
    }

    /**
     * Remove the image of a species.
     * @param {number} id species id
     * @return {Promise<boolean>}
     */
    public static async deleteImage(id: number): Promise<boolean> {
        const result = await NetFetch.postData('/json/species/image/delete', {id});

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
     * Cross-species regression matrix (4 scatter charts + pooled fits)
     * for Simpson-paradox visibility. Period bounds optional.
     */
    public static async getRegressionMatrix(periodFrom?: string, periodTo?: string): Promise<SpeciesRegressionChart[] | null> {
        const body: {period_from?: string; period_to?: string;} = {};
        if (periodFrom) {
            body.period_from = periodFrom;
        }
        if (periodTo) {
            body.period_to = periodTo;
        }
        const result = await NetFetch.postData('/json/species/regression-matrix', body) as SpeciesRegressionMatrixResponse;

        if (result && result.statusCode === StatusCodes.UNAUTHORIZED) {
            throw new UnauthorizedError();
        }

        if (result && result.statusCode === StatusCodes.OK) {
            return result.charts ?? [];
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