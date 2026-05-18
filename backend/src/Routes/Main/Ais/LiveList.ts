import {StatusCodes} from 'figtree-schemas';
import {AisLiveListRequest, AisLiveListResponse, AisLiveVesselEntry} from 'mwpa_schemas';
import {AisVesselRepository} from '../../../Db/MariaDb/Repositories/AisVesselRepository.js';
import {LiveAisTrackRepository} from '../../../Db/MariaDb/Repositories/LiveAisTrackRepository.js';

const DEFAULT_MAX_AGE_SECONDS = 3600;

/**
 * One row per MMSI that has a fresh-enough ping in the live buffer.
 * Joins the latest ping with the static AisVessel metadata cache for
 * name/flag/ship-type display.
 */
export class LiveList {

    public static async getList(req: AisLiveListRequest): Promise<AisLiveListResponse> {
        const maxAge = req.max_age_seconds && req.max_age_seconds > 0
            ? req.max_age_seconds
            : DEFAULT_MAX_AGE_SECONDS;
        const sinceSec = Math.floor(Date.now() / 1000) - maxAge;

        const bbox = req.bbox ? {
            minLat: req.bbox.min_lat,
            maxLat: req.bbox.max_lat,
            minLon: req.bbox.min_lon,
            maxLon: req.bbox.max_lon
        } : undefined;

        const pings = await LiveAisTrackRepository.getInstance().findLatestPerMmsi(sinceSec, bbox);

        // One round-trip for all the vessel metadata — order of
        // magnitude faster than per-MMSI lookups.
        const mmsis = pings.map((p) => p.mmsi);
        const vessels = await AisVesselRepository.getInstance().findManyByMmsi(mmsis);
        const vesselByMmsi = new Map<string, typeof vessels[number]>();
        for (const v of vessels) {
            vesselByMmsi.set(v.mmsi, v);
        }

        const list: AisLiveVesselEntry[] = pings.map((ping) => {
            const v = vesselByMmsi.get(ping.mmsi);
            const shipType = ping.ship_type ?? v?.ship_type ?? undefined;
            return {
                mmsi: ping.mmsi,
                name: v?.name && v.name !== '' ? v.name : undefined,
                flag: v?.flag && v.flag !== '' ? v.flag : undefined,
                ship_type: shipType ?? undefined,
                lat: ping.lat,
                lon: ping.lon,
                sog: ping.sog ?? undefined,
                cog: ping.cog ?? undefined,
                received_at: ping.received_at
            };
        });

        return {statusCode: StatusCodes.OK, list: list};
    }

}