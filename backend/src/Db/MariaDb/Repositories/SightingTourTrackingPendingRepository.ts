import {DBRepositoryUnid} from 'figtree';
import {SightingTourTrackingPending} from '../Entities/SightingTourTrackingPending.js';

/**
 * Optional filter criteria for {@link SightingTourTrackingPendingRepository.findDistinctOrphans}.
 */
export type OrphanTracksFilterCriteria = {
    period_from?: string;
    period_to?: string;
    device_id?: number;
};

/**
 * One distinct (tour_fid, device_id) bucket with aggregates.
 */
export type OrphanTrackBucket = {
    tour_fid: string;
    device_id: number;
    count: number;
    min_create_datetime: number;
    max_create_datetime: number;
};

/**
 * SightingTourTrackingPending repository
 */
export class SightingTourTrackingPendingRepository extends DBRepositoryUnid<SightingTourTrackingPending> {

    /**
     * register name
     */
    public static REGISTER_NAME = 'sighting_tour_tracking_pending';

    /**
     * Return an instance
     * @return {SightingTourTrackingPendingRepository}
     */
    public static getInstance(): SightingTourTrackingPendingRepository {
        return super.getSingleInstance(SightingTourTrackingPending);
    }

    /**
     * Count pending tracks for a (tour_fid, device).
     * @param {string} tourFid
     * @param {number} deviceId
     * @return {number}
     */
    public async countByTourFidAndDevice(tourFid: string, deviceId: number): Promise<number> {
        const repository = await this._repository;
        return repository.count({
            where: {
                tour_fid: tourFid,
                device_id: deviceId
            }
        });
    }

    /**
     * Load all pending tracks for a (tour_fid, device).
     * @param {string} tourFid
     * @param {number} deviceId
     * @return {SightingTourTrackingPending[]}
     */
    public async findByTourFidAndDevice(tourFid: string, deviceId: number): Promise<SightingTourTrackingPending[]> {
        const repository = await this._repository;
        return repository.find({
            where: {
                tour_fid: tourFid,
                device_id: deviceId
            }
        });
    }

    /**
     * Delete all pending tracks for a (tour_fid, device). Called after
     * the rows have been promoted into `sighting_tour_tracking`.
     * @param {string} tourFid
     * @param {number} deviceId
     */
    public async deleteByTourFidAndDevice(tourFid: string, deviceId: number): Promise<void> {
        const repository = await this._repository;
        await repository.delete({
            tour_fid: tourFid,
            device_id: deviceId
        });
    }

    /**
     * Return distinct (tour_fid, device_id) pairs from the pending bucket that
     * have NO matching `sighting_tour` row — i.e. tracks whose parent tour
     * either never arrived, or had its tour_fid components (vehicle/driver/
     * date/time) edited later on the sighting, leaving the tracks orphaned.
     *
     * For each pair, returns the row count and the min/max upload timestamps.
     * Non-admin callers pass `orgIds` to restrict results to devices owned by
     * users whose main group resolves into one of the allowed organisations.
     *
     * @param {OrphanTracksFilterCriteria | undefined} filter
     * @param {number[] | undefined} orgIds — undefined = admin (no restriction); empty = no access
     * @param {number | undefined} skip
     * @param {number | undefined} take
     * @return {{rows: OrphanTrackBucket[]; count: number}}
     */
    public async findDistinctOrphans(
        filter?: OrphanTracksFilterCriteria,
        orgIds?: number[],
        skip?: number,
        take?: number
    ): Promise<{rows: OrphanTrackBucket[]; count: number}> {
        if (orgIds !== undefined && orgIds.length === 0) {
            return {rows: [], count: 0};
        }

        const repository = await this._repository;
        const qb = repository.createQueryBuilder('p')
            .select('p.tour_fid', 'tour_fid')
            .addSelect('p.device_id', 'device_id')
            .addSelect('COUNT(*)', 'count')
            .addSelect('MIN(p.create_datetime)', 'min_create_datetime')
            .addSelect('MAX(p.create_datetime)', 'max_create_datetime')
            .where('NOT EXISTS (SELECT 1 FROM sighting_tour st ' +
                'WHERE st.tour_fid = p.tour_fid AND st.device_id = p.device_id)');

        const periodFrom = (filter?.period_from ?? '').trim();
        const periodTo = (filter?.period_to ?? '').trim();

        if (periodFrom !== '') {
            const fromSec = Math.floor(new Date(periodFrom).getTime() / 1000);
            if (!Number.isNaN(fromSec)) {
                qb.andWhere('p.create_datetime >= :fromSec', {fromSec});
            }
        }

        if (periodTo !== '') {
            // Inclusive end-of-day: add 24h-1s
            const toSec = Math.floor(new Date(periodTo).getTime() / 1000) + 86400 - 1;
            if (!Number.isNaN(toSec)) {
                qb.andWhere('p.create_datetime <= :toSec', {toSec});
            }
        }

        if (filter?.device_id !== undefined && filter.device_id > 0) {
            qb.andWhere('p.device_id = :deviceId', {deviceId: filter.device_id});
        }

        if (orgIds !== undefined) {
            qb.andWhere(
                'p.device_id IN (' +
                'SELECT d.id FROM devices d ' +
                'INNER JOIN user u ON u.id = d.user_id ' +
                'INNER JOIN \`group\` g ON g.id = u.main_groupid ' +
                'WHERE g.organization_id IN (:...orgIds))',
                {orgIds}
            );
        }

        qb.groupBy('p.tour_fid').addGroupBy('p.device_id');

        const countRows: {c: string}[] = await repository.manager
            .createQueryBuilder()
            .select('COUNT(*)', 'c')
            .from('(' + qb.getQuery() + ')', 'sub')
            .setParameters(qb.getParameters())
            .getRawMany();
        const count = Number(countRows[0]?.c ?? 0);

        qb.orderBy('min_create_datetime', 'DESC');
        if (skip !== undefined) {
            qb.offset(skip);
        }
        if (take !== undefined) {
            qb.limit(take);
        }

        const raw: {tour_fid: string; device_id: string; count: string; min_create_datetime: string; max_create_datetime: string;}[] = await qb.getRawMany();
        const rows: OrphanTrackBucket[] = raw.map((r) => ({
            tour_fid: r.tour_fid,
            device_id: Number(r.device_id),
            count: Number(r.count),
            min_create_datetime: Number(r.min_create_datetime),
            max_create_datetime: Number(r.max_create_datetime)
        }));

        return {rows, count};
    }

}