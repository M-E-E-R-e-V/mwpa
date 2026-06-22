import {StatusCodes} from 'figtree-schemas';
import {SightingCurrentRegionRequest, SightingCurrentRegionResponse} from 'mwpa_schemas';
import {SightingCurrentFieldRepository} from '../../../Db/MariaDb/Repositories/SightingCurrentFieldRepository.js';

/**
 * /json/sightings/currents/region handler — return the regional CMEMS
 * u/v patch for a single sighting.
 *
 * Wire shape: the underlying grid (`grid_lat[]`, `grid_lon[]`, plus
 * two 2D arrays `u[][]`, `v[][]`) is JSON-encoded into a single
 * `grid_json` string field, because vts doesn't currently model 2D
 * arrays in the wire schema and the payload at 9×9 is small enough
 * (~1–2 KB) that the encode/decode cost is negligible. The frontend
 * `JSON.parse`s `grid_json` back into the typed structure.
 *
 * When no patch has been fetched yet for the sighting (the
 * CurrentFieldService cron hasn't reached it, or the sighting is
 * filtered out — land, invalid date, etc.), the response is
 * `statusCode: OK` with `entry: undefined`. That lets the caller
 * distinguish "no data yet" from "auth/server error" without an HTTP
 * 4xx that would muddle retries.
 */
export class CurrentRegion {

    /**
     * Load the regional patch for one sighting.
     */
    public static async getRegion(body: SightingCurrentRegionRequest): Promise<SightingCurrentRegionResponse> {
        const row = await SightingCurrentFieldRepository.getInstance().findOneBySighting(body.sighting_id);

        if (row === null) {
            return {
                statusCode: StatusCodes.OK
            };
        }

        return {
            statusCode: StatusCodes.OK,
            entry: {
                sighting_id: row.sighting_id,
                bbox_west: Number(row.bbox_west),
                bbox_east: Number(row.bbox_east),
                bbox_south: Number(row.bbox_south),
                bbox_north: Number(row.bbox_north),
                grid_step_deg: Number(row.grid_step_deg),
                grid_n_lat: row.grid_n_lat,
                grid_n_lon: row.grid_n_lon,
                grid_json: JSON.stringify(row.field_json),
                source: row.source,
                valid_at: row.valid_at.toISOString(),
                fetched_at: row.fetched_at.toISOString()
            }
        };
    }

}