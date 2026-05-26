import {
    EarthquakeEntry,
    EarthquakeFilter,
    EarthquakeImportResponse,
    EarthquakeListResponse,
    EarthquakeRecorrelateResponse
} from 'mwpa_schemas';
import {NetFetch} from '../Net/NetFetch';
import {UnauthorizedError} from './Error/UnauthorizedError';
import {StatusCodes} from './Status/StatusCodes';

export type {
    EarthquakeEntry,
    EarthquakeFilter,
    EarthquakeListResponse,
    EarthquakeImportResponse,
    EarthquakeRecorrelateResponse
};

/**
 * Earthquake
 *
 * Thin wrapper over the admin earthquake endpoints (list + manual
 * import trigger). UnauthorizedError propagates so the global handler
 * can bounce the session.
 */
export class Earthquake {

    public static async getList(filter: EarthquakeFilter): Promise<EarthquakeListResponse | null> {
        const result = await NetFetch.postData('/json/earthquake/list', filter) as EarthquakeListResponse;

        if (result && result.statusCode === StatusCodes.UNAUTHORIZED) {
            throw new UnauthorizedError();
        }
        if (result && result.statusCode === StatusCodes.OK) {
            return result;
        }
        return null;
    }

    public static async runImport(backfillFrom?: string): Promise<EarthquakeImportResponse | null> {
        const body: {backfill_from?: string;} = {};
        if (backfillFrom) {
            body.backfill_from = backfillFrom;
        }
        const result = await NetFetch.postData('/json/earthquake/import', body) as EarthquakeImportResponse;

        if (result && result.statusCode === StatusCodes.UNAUTHORIZED) {
            throw new UnauthorizedError();
        }
        return result ?? null;
    }

    /**
     * Walk every earthquake already in the DB and re-write the
     * sighting_seismic correlations. Used to retroactively pick up
     * older sightings after a wide backfill.
     */
    public static async runRecorrelate(): Promise<EarthquakeRecorrelateResponse | null> {
        const result = await NetFetch.getData('/json/earthquake/recorrelate') as EarthquakeRecorrelateResponse;

        if (result && result.statusCode === StatusCodes.UNAUTHORIZED) {
            throw new UnauthorizedError();
        }
        return result ?? null;
    }

}