import {StatusCodes} from 'figtree-schemas';
import {AisVesselTrackPoint, AisVesselTrackResponse} from 'mwpa_schemas';
import {LiveAisTrackRepository} from '../../../Db/MariaDb/Repositories/LiveAisTrackRepository.js';

const DEFAULT_SINCE_SECONDS = 3600;

/**
 * Chronological track for one MMSI from the live buffer. Used by the
 * live-map "click on a vessel → show trail" overlay.
 */
export class VesselTrack {

    public static async getTrack(mmsi: string, sinceSeconds?: number): Promise<AisVesselTrackResponse> {
        const window = sinceSeconds && sinceSeconds > 0 ? sinceSeconds : DEFAULT_SINCE_SECONDS;
        const sinceSec = Math.floor(Date.now() / 1000) - window;

        const rows = await LiveAisTrackRepository.getInstance().findTrackByMmsi(mmsi, sinceSec);

        const points: AisVesselTrackPoint[] = rows.map((r) => ({
            lat: r.lat,
            lon: r.lon,
            sog: r.sog ?? undefined,
            cog: r.cog ?? undefined,
            received_at: r.received_at
        }));

        return {
            statusCode: StatusCodes.OK,
            mmsi,
            points
        };
    }

}
