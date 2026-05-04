import {Logger} from 'figtree';
import {Vts} from 'vts';
import {DefaultMobileV1Return, SightingTourTrackingEntry, SightingTourTrackingRequest} from 'mwpa_schemas';
import {SightingTourTracking as SightingTourTrackingDB} from '../../../Db/MariaDb/Entities/SightingTourTracking.js';
import {DevicesRepository} from '../../../Db/MariaDb/Repositories/DevicesRepository.js';
import {SightingTourRepository} from '../../../Db/MariaDb/Repositories/SightingTourRepository.js';
import {SightingTourTrackingRepository} from '../../../Db/MariaDb/Repositories/SightingTourTrackingRepository.js';
import {MobileV1StatusCode} from '../MobileV1.js';

/**
 * Save
 */
export class Save {

    /**
     * Persist a batch of tracking points. Entries are grouped by tour_fid; for each group the
     * matching tour is loaded once and missing tracks (by unid) are inserted. Entries with empty
     * unid are skipped.
     * @param {string} deviceIdentity
     * @param {SightingTourTrackingRequest} request
     * @return {DefaultMobileV1Return}
     */
    public static async save(deviceIdentity: string, request?: SightingTourTrackingRequest): Promise<DefaultMobileV1Return> {
        if (Vts.isUndefined(request)) {
            return {
                statusCode: MobileV1StatusCode.INTERNAL_ERROR,
                msg: 'Request incomplete'
            };
        }

        const device = await DevicesRepository.getInstance().findByIdentity(deviceIdentity);

        if (!device) {
            return {
                statusCode: MobileV1StatusCode.INTERNAL_ERROR,
                msg: 'Device not found!'
            };
        }

        const groupedByTour = new Map<string, SightingTourTrackingEntry[]>();

        for (const entry of request.list) {
            if (entry.unid === '') {
                Logger.getLogger().warn(`Mobile/SightingTourTracking::save: empty unid for tour_fid: ${entry.tour_fid}`);
                continue;
            }

            const list = groupedByTour.get(entry.tour_fid) ?? [];
            list.push(entry);
            groupedByTour.set(entry.tour_fid, list);
        }

        for (const [tourFid, entries] of groupedByTour) {
            const tour = await SightingTourRepository.getInstance().findByTourFidAndDevice(tourFid, device.id);

            if (!tour) {
                Logger.getLogger().info(`Mobile/SightingTourTracking::save: tour not found by tour_fid: ${tourFid}`);
                continue;
            }

            let countAdd = 0;

            for (const entry of entries) {
                const existing = await SightingTourTrackingRepository.getInstance().findOne(entry.unid);
                if (existing) {
                    continue;
                }

                const ts = Math.floor(new Date(entry.date).getTime() / 1000);
                const track = new SightingTourTrackingDB();
                track.unid = entry.unid;
                track.create_datetime = Number.isFinite(ts) ? ts : 0;
                track.sighting_tour_id = tour.id;
                track.position = entry.location;

                await SightingTourTrackingRepository.getInstance().save(track);
                countAdd++;
            }

            Logger.getLogger().info(`Mobile/SightingTourTracking::save: added ${countAdd}/${entries.length} for tour_fid: ${tourFid}`);
        }

        return {
            statusCode: MobileV1StatusCode.OK
        };
    }

}