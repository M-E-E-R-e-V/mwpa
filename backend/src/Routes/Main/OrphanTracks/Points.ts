import {StatusCodes} from 'figtree-schemas';
import {OrphanTracksPoint, OrphanTracksPointsRequest, OrphanTracksPointsResponse} from 'mwpa_schemas';
import {SightingTourTrackingPendingRepository} from '../../../Db/MariaDb/Repositories/SightingTourTrackingPendingRepository.js';

/**
 * Points
 *
 * Decode the `position` JSON of every pending row in the
 * (tour_fid, device_id) bucket into a {lat, lon, ts} list ordered by
 * `create_datetime` ascending — so the AssignModal can render the
 * orphan track on a small OL map and the admin can judge whether the
 * data looks usable or junk.
 */
export class Points {

    public static async getPoints(request?: OrphanTracksPointsRequest): Promise<OrphanTracksPointsResponse> {
        const tourFid = (request?.tour_fid ?? '').trim();
        const deviceId = Number(request?.device_id);
        if (tourFid === '' || !Number.isFinite(deviceId) || deviceId <= 0) {
            return {statusCode: StatusCodes.OK, points: []};
        }

        const rows = await SightingTourTrackingPendingRepository.getInstance()
            .findByTourFidAndDevice(tourFid, deviceId);

        const points: OrphanTracksPoint[] = [];
        for (const r of rows) {
            const pos = Points._parse(r.position);
            if (!pos) {
                continue;
            }
            points.push({lat: pos.lat, lon: pos.lon, ts: r.create_datetime});
        }
        points.sort((a, b) => a.ts - b.ts);

        return {statusCode: StatusCodes.OK, points: points};
    }

    private static _parse(jsonStr: string): {lat: number; lon: number;} | null {
        if (!jsonStr) {
            return null;
        }
        try {
            const obj = JSON.parse(jsonStr) as {latitude?: number; longitude?: number;};
            if (typeof obj.latitude === 'number' && typeof obj.longitude === 'number' &&
                Number.isFinite(obj.latitude) && Number.isFinite(obj.longitude)) {
                return {lat: obj.latitude, lon: obj.longitude};
            }
        } catch { /* ignore */ }
        return null;
    }

}