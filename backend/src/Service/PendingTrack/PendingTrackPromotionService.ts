import {Logger, ServiceJobAbstract} from 'figtree';
import {Const} from '../../Const.js';
import {SightingTour} from '../../Db/MariaDb/Entities/SightingTour.js';
import {SightingTourTracking} from '../../Db/MariaDb/Entities/SightingTourTracking.js';
import {DevicesRepository} from '../../Db/MariaDb/Repositories/DevicesRepository.js';
import {SightingTourRepository} from '../../Db/MariaDb/Repositories/SightingTourRepository.js';
import {SightingTourTrackingPendingRepository} from '../../Db/MariaDb/Repositories/SightingTourTrackingPendingRepository.js';
import {SightingTourTrackingRepository} from '../../Db/MariaDb/Repositories/SightingTourTrackingRepository.js';
import {Users} from '../../Users/Users.js';
import {UtilTourFid} from '../../Utils/UtilTourFid.js';
import {SightingMovementService} from '../Movement/SightingMovementService.js';

/**
 * Background promotion of buffered tracking points
 * ({@link SightingTourTrackingPending}) into the real
 * `sighting_tour_tracking` table.
 *
 * Two callsites use the shared `promoteForTour` step:
 *   - Mobile/Sightings/Save.ts — when a sighting creates/finds its tour,
 *     buffered tracks for that tour_fid get attached immediately.
 *   - This service's cron — when a tour_fid has been waiting longer than
 *     {@link Const.PENDING_TRACK_PROMOTION_AGE_SEC} without ever receiving
 *     a sighting, synthesise an empty `SightingTour` (effort-only) from
 *     the tour_fid components and promote the bucket into it.
 *
 * The empty-tour case is important for survey-effort statistics: even a
 * leg without sightings is data ("we were out for N hours, saw nothing").
 */
export class PendingTrackPromotionService extends ServiceJobAbstract {

    public static readonly NAME = 'pending-track-promotion';

    public constructor() {
        super(PendingTrackPromotionService.NAME, ['mariadb']);
        // Hourly is plenty — the bucket is only meaningful in the rare
        // "sighting will never arrive" case, and the promotion threshold
        // itself is 24 h.
        this._cron = '17 * * * *';
    }

    /**
     * Move buffered tracks for one (tour_fid, device, tour) triple into the
     * real tracking table, dedupe by `unid`, then clear the bucket. Returns
     * the number of rows actually promoted (i.e. inserted).
     *
     * Used by both the cron and Mobile/Sightings/Save.ts.
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
                    `PendingTrackPromotionService::promoteForTour: movement rebuild for tour ${sightingTourId}: ` +
                    `${stats.processed} ok, ${stats.failed} failed`
                );
            }).catch((err: unknown) => {
                Logger.getLogger().error(
                    `PendingTrackPromotionService::promoteForTour: movement rebuild for tour ${sightingTourId} crashed`,
                    err as Error
                );
            });
        }

        return promoted;
    }

    /**
     * Cron tick: find (tour_fid, device) pairs whose oldest pending row is
     * older than the threshold and that still have no matching tour, build
     * a synthetic empty tour for them, then promote the bucket.
     * @protected
     */
    protected async _execute(): Promise<void> {
        const logger = Logger.getLogger();
        const nowSec = Math.floor(Date.now() / 1000);
        const cutoff = nowSec - Const.PENDING_TRACK_PROMOTION_AGE_SEC;

        const candidates = await SightingTourTrackingPendingRepository
            .getInstance()
            .findDistinctOlderThan(cutoff);

        if (candidates.length === 0) {
            return;
        }

        logger.info(`PendingTrackPromotionService: ${candidates.length} stale tour_fid(s) to promote`);

        for (const {tour_fid: tourFid, device_id: deviceId} of candidates) {
            try {
                // Tour may have appeared since the cron picked it up (race with
                // a sighting save). If so, just attach the bucket — that's the
                // same path Mobile/Sightings/Save.ts already triggered.
                const existing = await SightingTourRepository
                    .getInstance()
                    .findByTourFidAndDevice(tourFid, deviceId);
                if (existing) {
                    const promoted = await PendingTrackPromotionService.promoteForTour(
                        tourFid,
                        deviceId,
                        existing.id
                    );
                    logger.info(
                        `PendingTrackPromotionService: tour_fid=${tourFid} attached to existing tour ` +
                        `${existing.id} (promoted=${promoted})`
                    );
                    continue;
                }

                const tour = await PendingTrackPromotionService.synthesiseTour(tourFid, deviceId, nowSec);
                if (!tour) {
                    // Couldn't reconstruct — leave the bucket entries in place
                    // so an admin can inspect. They won't be re-tried this
                    // cycle because they keep their old `pending_since`.
                    logger.warn(
                        `PendingTrackPromotionService: cannot synthesise tour for tour_fid=${tourFid} ` +
                        `device=${deviceId} — leaving rows for manual inspection`
                    );
                    continue;
                }

                const promoted = await PendingTrackPromotionService.promoteForTour(tourFid, deviceId, tour.id);
                logger.info(
                    `PendingTrackPromotionService: synthesised empty tour ${tour.id} for tour_fid=${tourFid} ` +
                    `device=${deviceId} (promoted=${promoted})`
                );
            } catch (e) {
                logger.error(
                    `PendingTrackPromotionService: promotion failed for tour_fid=${tourFid} device=${deviceId}: ` +
                    `${(e as Error).message}`
                );
            }
        }
    }

    /**
     * Build a `SightingTour` from a tour_fid that has no matching server-side
     * tour. Components are parsed back out of the tour_fid string; creater_id
     * and organization_id are sourced from the device's user. Returns null if
     * any of those lookups fails — the row stays in the bucket for inspection
     * rather than risking a malformed tour.
     *
     * @param {string} tourFid
     * @param {number} deviceId
     * @param {number} nowSec
     * @return {SightingTour | null}
     */
    private static async synthesiseTour(tourFid: string, deviceId: number, nowSec: number): Promise<SightingTour | null> {
        const parsed = UtilTourFid.parseTourFid(tourFid);
        if (!parsed) {
            return null;
        }

        const device = await DevicesRepository.getInstance().findOne(deviceId);
        if (!device) {
            return null;
        }

        const organization = await Users.getMainOrganization(device.user_id);
        const organizationId = organization?.id ?? 0;

        const tour = new SightingTour();
        tour.tour_fid = tourFid;
        tour.creater_id = device.user_id;
        tour.create_datetime = nowSec;
        tour.update_datetime = nowSec;
        tour.vehicle_id = parsed.vehicle_id;
        tour.vehicle_driver_id = parsed.vehicle_driver_id;
        tour.beaufort_wind = '';
        tour.date = parsed.date;
        tour.tour_start = parsed.tour_start;
        tour.tour_end = '';
        tour.organization_id = organizationId;
        tour.status = 2; // closed
        tour.record_by_persons = '';
        tour.device_id = deviceId;

        return SightingTourRepository.getInstance().save(tour);
    }

}