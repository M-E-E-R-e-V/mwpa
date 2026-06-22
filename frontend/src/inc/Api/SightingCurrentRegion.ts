import {NetFetch} from '../Net/NetFetch';
import {UnauthorizedError} from './Error/UnauthorizedError';
import {StatusCodes} from './Status/StatusCodes';
import {DefaultReturn} from './Types/DefaultReturn';

/**
 * Decoded shape of `SightingCurrentRegionEntry.grid_json`. Server-side
 * the field is a JSON string (vts doesn't model 2D arrays in the wire
 * schema); the API client `JSON.parse`s it once on read so callers
 * never see the encoded form.
 */
export type SightingCurrentRegionGrid = {
    grid_lat: number[];
    grid_lon: number[];
    u: (number | null)[][];
    v: (number | null)[][];
};

/**
 * Per-sighting regional CMEMS u/v patch with the grid decoded.
 */
export type SightingCurrentRegionEntry = {
    sighting_id: number;
    bbox_west: number;
    bbox_east: number;
    bbox_south: number;
    bbox_north: number;
    grid_step_deg: number;
    grid_n_lat: number;
    grid_n_lon: number;
    grid: SightingCurrentRegionGrid;
    source: string;
    valid_at: string;
    fetched_at: string;
};

type RawSightingCurrentRegionResponse = DefaultReturn & {
    entry?: {
        sighting_id: number;
        bbox_west: number;
        bbox_east: number;
        bbox_south: number;
        bbox_north: number;
        grid_step_deg: number;
        grid_n_lat: number;
        grid_n_lon: number;
        grid_json: string;
        source: string;
        valid_at: string;
        fetched_at: string;
    };
};

/**
 * `/json/sightings/currents/region` client. Returns `null` on
 * non-OK status codes (other than UNAUTHORIZED, which throws). The
 * outer `entry` may be `undefined` when no patch has been fetched yet
 * for the sighting — that's an OK response, not an error.
 */
export class SightingCurrentRegion {

    public static async get(sightingId: number): Promise<SightingCurrentRegionEntry | null | undefined> {
        const result = await NetFetch.postData('/json/sightings/currents/region', {sighting_id: sightingId}) as RawSightingCurrentRegionResponse | null;

        if (!result || !result.statusCode) {
            return null;
        }

        if (result.statusCode === StatusCodes.UNAUTHORIZED) {
            throw new UnauthorizedError();
        }

        if (result.statusCode !== StatusCodes.OK) {
            return null;
        }

        const raw = result.entry;

        if (raw === undefined) {
            return undefined;
        }

        let grid: SightingCurrentRegionGrid;

        try {
            grid = JSON.parse(raw.grid_json) as SightingCurrentRegionGrid;
        } catch {
            return null;
        }

        return {
            sighting_id: raw.sighting_id,
            bbox_west: raw.bbox_west,
            bbox_east: raw.bbox_east,
            bbox_south: raw.bbox_south,
            bbox_north: raw.bbox_north,
            grid_step_deg: raw.grid_step_deg,
            grid_n_lat: raw.grid_n_lat,
            grid_n_lon: raw.grid_n_lon,
            grid: grid,
            source: raw.source,
            valid_at: raw.valid_at,
            fetched_at: raw.fetched_at
        };
    }

}