import {Logger} from 'figtree';
import {SightingTourTracking} from '../../Db/MariaDb/Entities/SightingTourTracking.js';
import {SightingTourTrackingPendingRepository} from '../../Db/MariaDb/Repositories/SightingTourTrackingPendingRepository.js';
import {SightingTourTrackingRepository} from '../../Db/MariaDb/Repositories/SightingTourTrackingRepository.js';
import {SightingMovementService} from '../Movement/SightingMovementService.js';

/**
 * Promote buffered tracking points ({@link SightingTourTrackingPending}) into
 * the real `sighting_tour_tracking` table for a known target tour.
 *
 * Callsites:
 *   - Mobile/Sightings/Save.ts — when a sighting creates/finds its tour,
 *     buffered tracks for that tour_fid get attached immediately.
 *   - Routes/Main/OrphanTracks/Assign.ts — admin manually attaches a stale
 *     bucket to an existing tour after fixing crew/boot on the sighting.
 */
export class PendingTrackPromoter {

    /**
     * Move buffered tracks for one (tour_fid, device, tour) triple into the
     * real tracking table, dedupe by `unid`, then clear the bucket. Returns
     * the number of rows actually promoted (i.e. inserted).
     *
     * @param {string} tourFid
     * @param {number} deviceId
     * @param {number} sightingTourId
     * @return {number}
     */
    public static async promoteForTour(tourFid: string, deviceId: number, sightingTourId: number): Promise<number> {
        const pendingRepo = SightingTourTrackingPendingRepository.getInstance();
        const trackRepo = SightingTourTrackingRepository.getInstance();

        const pendingRows = await pendingRepo.findByTourFidAndDevice(tourFid, deviceId);
        if (pendingRows.length === 0) {
            return 0;
        }

        let promoted = 0;
        for (const pending of pendingRows) {
            if (await trackRepo.findOne(pending.unid)) {
                continue;
            }

            const track = new SightingTourTracking();
            track.unid = pending.unid;
            track.create_datetime = pending.create_datetime;
            track.sighting_tour_id = sightingTourId;
            track.position = pending.position;

            await trackRepo.save(track);
            promoted++;
        }

        await pendingRepo.deleteByTourFidAndDevice(tourFid, deviceId);

        if (promoted > 0) {
            SightingMovementService.getInstance().rebuildForTour(sightingTourId).then((stats) => {
                Logger.getLogger().info(
                    `PendingTrackPromoter::promoteForTour: movement rebuild for tour ${sightingTourId}: ` +
                    `${stats.processed} ok, ${stats.failed} failed`
                );
            }).catch((err: unknown) => {
                Logger.getLogger().error(
                    `PendingTrackPromoter::promoteForTour: movement rebuild for tour ${sightingTourId} crashed`,
                    err as Error
                );
            });
        }

        return promoted;
    }

}