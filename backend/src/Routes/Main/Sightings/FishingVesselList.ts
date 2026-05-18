import {StatusCodes} from 'figtree-schemas';
import {SightingFishingVesselEntry, SightingFishingVesselListRequest, SightingFishingVesselListResponse} from 'mwpa_schemas';
import {SightingFishingVesselRepository} from '../../../Db/MariaDb/Repositories/SightingFishingVesselRepository.js';

/**
 * Bulk-fetch the per-vessel breakdown for a set of sightings —
 * same shape as the SightingMovement list endpoint so the
 * Sighting-page frontend can reuse the streaming-by-chunk pattern.
 */
export class FishingVesselList {

    public static async getList(req: SightingFishingVesselListRequest): Promise<SightingFishingVesselListResponse> {
        const ids = req.sighting_ids ?? [];
        if (ids.length === 0) {
            return {statusCode: StatusCodes.OK, list: []};
        }

        const rows = await SightingFishingVesselRepository.getInstance().findManyBySightings(ids);

        const list: SightingFishingVesselEntry[] = rows.map((row) => ({
            sighting_id: row.sighting_id,
            vessel_id: row.vessel_id,
            name: row.name === '' ? undefined : row.name,
            mmsi: row.mmsi === '' ? undefined : row.mmsi,
            flag: row.flag === '' ? undefined : row.flag,
            gear_type: row.gear_type === '' ? undefined : row.gear_type,
            hours: row.hours
        }));

        return {statusCode: StatusCodes.OK, list};
    }

}