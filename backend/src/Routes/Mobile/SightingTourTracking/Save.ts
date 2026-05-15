import {Logger} from 'figtree';
import {Vts} from 'vts';
import {DefaultMobileV1Return, SightingTourTrackingEntry, SightingTourTrackingRequest} from 'mwpa_schemas';
import {SightingTourTracking as SightingTourTrackingDB} from '../../../Db/MariaDb/Entities/SightingTourTracking.js';
import {SightingTourTrackingPending as SightingTourTrackingPendingDB} from '../../../Db/MariaDb/Entities/SightingTourTrackingPending.js';
import {DevicesRepository} from '../../../Db/MariaDb/Repositories/DevicesRepository.js';
import {SightingTourRepository} from '../../../Db/MariaDb/Repositories/SightingTourRepository.js';
import {SightingTourTrackingPendingRepository} from '../../../Db/MariaDb/Repositories/SightingTourTrackingPendingRepository.js';
import {SightingTourTrackingRepository} from '../../../Db/MariaDb/Repositories/SightingTourTrackingRepository.js';
import {SightingMovementService} from '../../../Service/Movement/SightingMovementService.js';
import {MobileV1StatusCode} from '../MobileV1.js';

/**
 * Save
 */
export class Save {

    /**
     * Persist a batch of tracking points. Entries are grouped by tour_fid; for each group the
     * matching tour is loaded once and missing tracks (by unid) are inserted. Entries with empty
     * unid are skipped.
     *
     * If no `SightingTour` exists yet for a given tour_fid, the entries are stored in the
     * `sighting_tour_tracking_pending` bucket and will be promoted into `sighting_tour_tracking`
     * later when a sighting with the matching tour_fid is saved (see Mobile/Sightings/Save.ts).
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

        // Tours whose track gained new points — sighting movements for these
        // tours need to be recomputed once the sync is done.
        const affectedTourIds = new Set<number>();
        const nowSec = Math.floor(Date.now() / 1000);

        for (const [tourFid, entries] of groupedByTour) {
            const tour = await SightingTourRepository.getInstance().findByTourFidAndDevice(tourFid, device.id);

            if (tour) {
                const countAdd = await Save.persistIntoTour(tour.id, entries);
                if (countAdd > 0) {
                    affectedTourIds.add(tour.id);
                }
                Logger.getLogger().info(
                    `Mobile/SightingTourTracking::save: added ${countAdd}/${entries.length} for tour_fid: ${tourFid}`
                );
            } else {
                const countAdd = await Save.persistIntoPending(tourFid, device.id, nowSec, entries);
                Logger.getLogger().info(
                    `Mobile/SightingTourTracking::save: buffered ${countAdd}/${entries.length} pending for tour_fid: ${tourFid}`
                );
            }
        }

        // Fire-and-forget rebuild of movements for every tour that gained
        // points. Done after the response is sent (we don't await) so the
        // mobile sync stays fast — service handles its own errors.
        if (affectedTourIds.size > 0) {
            const service = SightingMovementService.getInstance();
            for (const tourId of affectedTourIds) {
                service.rebuildForTour(tourId).then((stats) => {
                    Logger.getLogger().info(
                        `Mobile/SightingTourTracking::save: movement rebuild for tour ${tourId}: ${stats.processed} ok, ${stats.failed} failed`
                    );
                }).catch((err: unknown) => {
                    Logger.getLogger().error(
                        `Mobile/SightingTourTracking::save: movement rebuild for tour ${tourId} crashed`,
                        err as Error
                    );
                });
            }
        }

        return {
            statusCode: MobileV1StatusCode.OK
        };
    }

    /**
     * Insert entries into the real tracking table. Dedupes by `unid` against both the
     * tracking table and the pending bucket so a re-uploaded entry is never duplicated.
     * @param {number} sightingTourId
     * @param {SightingTourTrackingEntry[]} entries
     * @return {number} number of rows inserted
     */
    private static async persistIntoTour(sightingTourId: number, entries: SightingTourTrackingEntry[]): Promise<number> {
        const trackRepo = SightingTourTrackingRepository.getInstance();
        const pendingRepo = SightingTourTrackingPendingRepository.getInstance();
        let countAdd = 0;

        for (const entry of entries) {
            if (await trackRepo.findOne(entry.unid)) {
                continue;
            }
            if (await pendingRepo.findOne(entry.unid)) {
                // A copy is already buffered — leave it to the promotion step on
                // the next sighting save to move it into the tracking table.
                continue;
            }

            const ts = Math.floor(new Date(entry.date).getTime() / 1000);
            const track = new SightingTourTrackingDB();
            track.unid = entry.unid;
            track.create_datetime = Number.isFinite(ts) ? ts : 0;
            track.sighting_tour_id = sightingTourId;
            track.position = entry.location;

            await trackRepo.save(track);
            countAdd++;
        }

        return countAdd;
    }

    /**
     * Store entries in the pending bucket because no SightingTour exists yet
     * for their tour_fid. Dedupes by `unid` against both the pending bucket
     * (idempotent re-uploads) and the real tracking table (in case the tour
     * appeared between the device's check and save calls).
     * @param {string} tourFid
     * @param {number} deviceId
     * @param {number} nowSec
     * @param {SightingTourTrackingEntry[]} entries
     * @return {number} number of rows buffered
     */
    private static async persistIntoPending(
        tourFid: string,
        deviceId: number,
        nowSec: number,
        entries: SightingTourTrackingEntry[]
    ): Promise<number> {
        const trackRepo = SightingTourTrackingRepository.getInstance();
        const pendingRepo = SightingTourTrackingPendingRepository.getInstance();
        let countAdd = 0;

        for (const entry of entries) {
            if (await pendingRepo.findOne(entry.unid)) {
                continue;
            }
            if (await trackRepo.findOne(entry.unid)) {
                continue;
            }

            const ts = Math.floor(new Date(entry.date).getTime() / 1000);
            const pending = new SightingTourTrackingPendingDB();
            pending.unid = entry.unid;
            pending.tour_fid = tourFid;
            pending.device_id = deviceId;
            pending.create_datetime = Number.isFinite(ts) ? ts : 0;
            pending.position = entry.location;
            pending.pending_since = nowSec;

            await pendingRepo.save(pending);
            countAdd++;
        }

        return countAdd;
    }

}