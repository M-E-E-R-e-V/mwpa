import {NetFetch} from '../Net/NetFetch';
import {UnauthorizedError} from './Error/UnauthorizedError';
import {StatusCodes} from './Status/StatusCodes';
import {DefaultReturn} from './Types/DefaultReturn';

/**
 * One segment of a sighting's computed movement. Shape mirrors
 * `SchemaSightingMovementTrackEntry` on the backend.
 */
export type SightingMovementTrackEntry = {
    sequence_no: number;
    start_lat: number;
    start_lon: number;
    end_lat: number;
    end_lon: number;
    start_dt: number;
    end_dt: number;
    distance_m: number;
    duration_s: number;
    speed_mps?: number;
    heading_deg?: number;
    turning_angle_deg?: number;
    quality: 'good' | 'bad' | string;
};

/**
 * Header + segments for one sighting. `tracks` is ordered by
 * `sequence_no` ascending.
 */
export type SightingMovementEntry = {
    sighting_id: number;
    source: 'tracking' | 'manual_begin_end' | 'hybrid' | string;
    segment_count: number;
    total_distance_m: number;
    total_duration_s: number;
    avg_speed_mps?: number;
    max_speed_mps?: number;
    dominant_heading_deg?: number;
    heading_variance_deg?: number;
    bbox_min_lat?: number;
    bbox_min_lon?: number;
    bbox_max_lat?: number;
    bbox_max_lon?: number;
    first_dt: number;
    last_dt: number;
    computed_at: number;
    tracks: SightingMovementTrackEntry[];
};

export type SightingMovementListRequest = {
    sighting_ids: number[];
};

export type SightingMovementListResponse = DefaultReturn & {
    list?: SightingMovementEntry[];
};

/**
 * MovementConfig — persisted rebuild tunables. Same field names as the
 * backend MovementConfigEntry. All fields required on save; the loader
 * fills defaults when reading a partial row.
 */
export type MovementConfigEntry = {
    default_lead_minutes: number;
    default_trail_minutes: number;
    prefer_sighting_duration: boolean;
    outlier_speed_kmh: number;
    default_local_tz: string;
};

export type MovementConfigResponse = DefaultReturn & {
    config?: MovementConfigEntry;
};

/**
 * SightingMovement API helper.
 *
 * Backend lazily computes the movement on sighting save / mobile tracking
 * sync, so `getList` returns whatever has been computed so far. Sightings
 * whose movement hasn't been computed yet are silently omitted.
 */
export class SightingMovement {

    /**
     * Bulk-fetch movements for a set of sighting ids. Returns an empty
     * array on any non-OK response. UNAUTHORIZED still throws so the
     * page can redirect to login.
     */
    public static async getList(sightingIds: number[]): Promise<SightingMovementEntry[]> {
        if (sightingIds.length === 0) {
            return [];
        }

        const req: SightingMovementListRequest = {sighting_ids: sightingIds};
        const result = await NetFetch.postData('/json/sighting/movement/list', req);

        if (result && result.statusCode) {
            switch (result.statusCode) {
                case StatusCodes.OK:
                    return ((result as SightingMovementListResponse).list) ?? [];

                case StatusCodes.UNAUTHORIZED:
                    throw new UnauthorizedError();
            }
        }

        return [];
    }

    /**
     * Trigger the admin bulk-rebuild. Synchronous on the server side —
     * the promise resolves only when every sighting has been processed.
     * Returns the server's free-form status message (counts).
     */
    public static async rebuildAll(): Promise<string> {
        const result = await NetFetch.getData('/json/sighting/movement/rebuild_all');

        if (result && result.statusCode) {
            switch (result.statusCode) {
                case StatusCodes.OK:
                    return result.msg ?? '';

                case StatusCodes.UNAUTHORIZED:
                    throw new UnauthorizedError();

                case StatusCodes.FORBIDDEN:
                    throw new Error('Forbidden — admin role required.');

                default:
                    if (result.msg) {
                        throw new Error(result.msg);
                    }
            }
        }

        throw new Error('Rebuild failed (no response).');
    }

    /**
     * Read the current MovementConfig (admin only). Throws on auth
     * problems or missing payload so the modal can show a banner;
     * otherwise returns the effective values.
     */
    public static async getConfig(): Promise<MovementConfigEntry> {
        const result = await NetFetch.getData('/json/sighting/movement/config');

        if (result && result.statusCode) {
            switch (result.statusCode) {
                case StatusCodes.OK:
                    if ((result as MovementConfigResponse).config) {
                        return (result as MovementConfigResponse).config!;
                    }
                    throw new Error('Config response missing payload.');

                case StatusCodes.UNAUTHORIZED:
                    throw new UnauthorizedError();

                case StatusCodes.FORBIDDEN:
                    throw new Error('Forbidden — admin role required.');

                default:
                    if (result.msg) {
                        throw new Error(result.msg);
                    }
            }
        }

        throw new Error('Config read failed (no response).');
    }

    /**
     * Persist a new MovementConfig (admin only). Backend validates each
     * field and returns the saved values; any validation problem is
     * thrown as an Error with the backend's `msg` so the modal can
     * surface it directly.
     */
    public static async saveConfig(config: MovementConfigEntry): Promise<MovementConfigEntry> {
        const result = await NetFetch.postData('/json/sighting/movement/config', config);

        if (result && result.statusCode) {
            switch (result.statusCode) {
                case StatusCodes.OK:
                    if ((result as MovementConfigResponse).config) {
                        return (result as MovementConfigResponse).config!;
                    }
                    throw new Error('Config response missing payload.');

                case StatusCodes.UNAUTHORIZED:
                    throw new UnauthorizedError();

                case StatusCodes.FORBIDDEN:
                    throw new Error('Forbidden — admin role required.');

                default:
                    if (result.msg) {
                        throw new Error(result.msg);
                    }
            }
        }

        throw new Error('Config save failed (no response).');
    }

}