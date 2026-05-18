import {DBRepository} from 'figtree';
import {Between, In, LessThan, MoreThanOrEqual} from 'typeorm';
import {LiveAisTrack} from '../Entities/LiveAisTrack.js';

/**
 * Insertable shape — what LiveAisService hands to `insertPing` after
 * the downsampling decision is made.
 */
export type LiveAisTrackInsert = {
    mmsi: string;
    lat: number;
    lon: number;
    sog: number | null;
    cog: number | null;
    ship_type: number | null;
    received_at: number;
};

export class LiveAisTrackRepository extends DBRepository<LiveAisTrack> {

    public static REGISTER_NAME = 'live_ais_track';

    public static getInstance(): LiveAisTrackRepository {
        return super.getSingleInstance(LiveAisTrack);
    }

    public async insertPing(ping: LiveAisTrackInsert): Promise<void> {
        const repo = await this._repository;
        const row = repo.create(ping);
        await repo.insert(row);
    }

    /**
     * Chronological track for one MMSI from `sinceSec` to now.
     * Used by the AIS-map "trail-on-click" endpoint. Returns ASC by
     * `received_at` so the frontend can feed the coords straight into
     * a LineString.
     */
    public async findTrackByMmsi(mmsi: string, sinceUtcSec: number): Promise<LiveAisTrack[]> {
        const repo = await this._repository;
        return repo.find({
            where: {
                mmsi,
                received_at: MoreThanOrEqual(sinceUtcSec)
            },
            order: {received_at: 'ASC'}
        });
    }

    /**
     * Pings for a set of MMSIs inside a UTC-seconds window. Used by
     * the tour-attribution cron after it's narrowed the candidate
     * MMSIs via a bounding-box query.
     */
    public async findByMmsiInRange(
        mmsis: string[],
        fromUtcSec: number,
        toUtcSec: number
    ): Promise<LiveAisTrack[]> {
        if (mmsis.length === 0) {
            return [];
        }
        const repo = await this._repository;
        return repo.find({
            where: {
                mmsi: In(mmsis),
                received_at: Between(fromUtcSec, toUtcSec)
            },
            order: {received_at: 'ASC'}
        });
    }

    /**
     * Find distinct MMSIs that had any ping inside a bounding box
     * + time window. Cheap pre-filter for the tour-attribution cron.
     */
    public async findDistinctMmsiInBbox(
        minLat: number,
        maxLat: number,
        minLon: number,
        maxLon: number,
        fromUtcSec: number,
        toUtcSec: number
    ): Promise<string[]> {
        const repo = await this._repository;
        const rows = await repo.createQueryBuilder('p')
            .select('DISTINCT p.mmsi', 'mmsi')
            .where('p.lat BETWEEN :minLat AND :maxLat', {minLat, maxLat})
            .andWhere('p.lon BETWEEN :minLon AND :maxLon', {minLon, maxLon})
            .andWhere('p.received_at BETWEEN :from AND :to', {from: fromUtcSec, to: toUtcSec})
            .getRawMany<{mmsi: string}>();
        return rows.map((r) => r.mmsi);
    }

    /**
     * Range-delete all pings older than the cutoff. Used by the
     * prune-cron — keep the hot buffer bounded.
     */
    public async pruneOlderThan(cutoffUtcSec: number): Promise<number> {
        const repo = await this._repository;
        const result = await repo.delete({received_at: LessThan(cutoffUtcSec)});
        return result.affected ?? 0;
    }

    /**
     * Latest ping per MMSI within the given time window, optionally
     * restricted to a bounding box. Returns one row per vessel — the
     * most recent ping that's still fresh enough to display on a
     * live map.
     *
     * Implementation: inner-join against a GROUP BY MAX(received_at)
     * subquery so MariaDB hits the (mmsi, received_at) composite
     * index for both halves of the join — much faster than a
     * correlated subquery as the table grows.
     */
    public async findLatestPerMmsi(
        sinceUtcSec: number,
        bbox?: {minLat: number; maxLat: number; minLon: number; maxLon: number;}
    ): Promise<LiveAisTrack[]> {
        const repo = await this._repository;
        const qb = repo.createQueryBuilder('p')
            .innerJoin(
                (sub) => sub
                    .select('mmsi', 'mmsi')
                    .addSelect('MAX(received_at)', 'max_recv')
                    .from(LiveAisTrack, 'pp')
                    .where('pp.received_at >= :since', {since: sinceUtcSec})
                    .groupBy('pp.mmsi'),
                'm',
                'm.mmsi = p.mmsi AND m.max_recv = p.received_at'
            );

        if (bbox) {
            qb.where('p.lat BETWEEN :minLat AND :maxLat AND p.lon BETWEEN :minLon AND :maxLon', bbox);
        }

        return qb.getMany();
    }

}