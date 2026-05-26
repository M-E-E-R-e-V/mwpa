import {
    EarthquakeEntry,
    EarthquakeFilter,
    EarthquakeImpactAnalytics,
    EarthquakeImpactBucket,
    EarthquakeImpactRequest,
    EarthquakeImpactResponse,
    EarthquakeImpactSighting,
    EarthquakeImpactTrack,
    EarthquakeImpactTrackSegment,
    EarthquakeListResponse,
    EarthquakeRecorrelateResponse
} from 'mwpa_schemas';
import {NetFetch} from '../Net/NetFetch';
import {UnauthorizedError} from './Error/UnauthorizedError';
import {StatusCodes} from './Status/StatusCodes';

export type {
    EarthquakeEntry,
    EarthquakeFilter,
    EarthquakeImpactAnalytics,
    EarthquakeImpactBucket,
    EarthquakeImpactRequest,
    EarthquakeImpactResponse,
    EarthquakeImpactSighting,
    EarthquakeImpactTrack,
    EarthquakeImpactTrackSegment,
    EarthquakeListResponse,
    EarthquakeRecorrelateResponse
};

/**
 * Earthquake
 *
 * Thin wrapper over the admin earthquake endpoints (list +
 * recorrelate). The import itself runs on an hourly cron; there is no
 * UI trigger. UnauthorizedError propagates so the global handler can
 * bounce the session.
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

    /**
     * Load the impact picture for one earthquake (by id) or a UTC day.
     * Returns focus earthquakes, affected sightings, per-sighting
     * movement tracks, and 4 analytics bucket arrays.
     */
    public static async runImpact(request: EarthquakeImpactRequest): Promise<EarthquakeImpactResponse | null> {
        const result = await NetFetch.postData('/json/earthquake/impact', request) as EarthquakeImpactResponse;

        if (result && result.statusCode === StatusCodes.UNAUTHORIZED) {
            throw new UnauthorizedError();
        }
        return result ?? null;
    }

    /**
     * Walk every earthquake already in the DB and re-write the
     * sighting_seismic correlations. Used after a configuration
     * change (radius/window) where existing rows need re-evaluation.
     */
    public static async runRecorrelate(): Promise<EarthquakeRecorrelateResponse | null> {
        const result = await NetFetch.getData('/json/earthquake/recorrelate') as EarthquakeRecorrelateResponse;

        if (result && result.statusCode === StatusCodes.UNAUTHORIZED) {
            throw new UnauthorizedError();
        }
        return result ?? null;
    }

}