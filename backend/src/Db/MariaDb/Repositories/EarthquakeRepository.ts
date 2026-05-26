import {DBRepository} from 'figtree';
import {Between, FindOptionsWhere, In, LessThanOrEqual, MoreThanOrEqual, Raw} from 'typeorm';
import {Earthquake} from '../Entities/Earthquake.js';

/**
 * Bbox parameter passed to {@link EarthquakeRepository.findByBbox} and
 * to the import flow.
 */
export type EarthquakeBbox = {
    min_lat: number;
    max_lat: number;
    min_lon: number;
    max_lon: number;
};

/**
 * Repository for the `earthquake` table. Lookup is dominated by:
 *   - upsert-by-(source, source_event_id) during import,
 *   - bbox + time range for the admin list,
 *   - radius lookup around a sighting (cheap bbox prefilter, exact
 *     Haversine in the caller — keeps the SQL simple).
 */
export class EarthquakeRepository extends DBRepository<Earthquake> {

    public static REGISTER_NAME = 'earthquake';

    public static getInstance(): EarthquakeRepository {
        return super.getSingleInstance(Earthquake);
    }

    /**
     * Find the most recent event_time_ms across the table (or 0 when
     * empty). Used by the import flow to compute `starttime` for the
     * next provider request without re-pulling the whole archive each
     * tick. Pass `source` to scope to one provider — needed when a
     * second provider is wired up after the first has been running, so
     * its own backfill starts from its own 0 instead of the global max.
     */
    public async getLatestEventTimeMs(source?: string): Promise<number> {
        const repository = await this._repository;
        const qb = repository.createQueryBuilder('e')
            .select('MAX(e.event_time_ms)', 'max_ts');
        if (source) {
            qb.where('e.source = :source', {source: source});
        }
        const row = await qb.getRawOne<{max_ts: number | string | null;}>();
        if (!row || row.max_ts === null) {
            return 0;
        }
        return Number(row.max_ts);
    }

    /**
     * Upsert by (source, source_event_id). Returns 'inserted' when a
     * new row was created, 'updated' when an existing row's mutable
     * fields changed, or 'unchanged' otherwise.
     */
    public async upsertBySourceEvent(event: {
        source: string;
        source_event_id: string;
        event_time_ms: number;
        lat: number;
        lon: number;
        depth_km: number | null;
        magnitude: number;
        magnitude_type: string;
        place: string;
        url: string;
    }): Promise<'inserted' | 'updated' | 'unchanged'> {
        const repository = await this._repository;
        const now = Math.floor(Date.now() / 1000);

        const existing = await repository.findOne({
            where: {source: event.source, source_event_id: event.source_event_id}
        });

        if (!existing) {
            const row = repository.create({
                source: event.source,
                source_event_id: event.source_event_id,
                event_time_ms: event.event_time_ms,
                lat: event.lat,
                lon: event.lon,
                depth_km: event.depth_km,
                magnitude: event.magnitude,
                magnitude_type: event.magnitude_type,
                place: event.place,
                url: event.url,
                create_datetime: now,
                update_datetime: now
            });
            await repository.save(row);
            return 'inserted';
        }

        let changed = false;
        if (existing.event_time_ms !== event.event_time_ms) {
            existing.event_time_ms = event.event_time_ms;
            changed = true;
        }
        if (existing.lat !== event.lat) {
            existing.lat = event.lat;
            changed = true;
        }
        if (existing.lon !== event.lon) {
            existing.lon = event.lon;
            changed = true;
        }
        if (existing.depth_km !== event.depth_km) {
            existing.depth_km = event.depth_km;
            changed = true;
        }
        if (existing.magnitude !== event.magnitude) {
            existing.magnitude = event.magnitude;
            changed = true;
        }
        if (existing.magnitude_type !== event.magnitude_type) {
            existing.magnitude_type = event.magnitude_type;
            changed = true;
        }
        if (existing.place !== event.place) {
            existing.place = event.place;
            changed = true;
        }
        if (existing.url !== event.url) {
            existing.url = event.url;
            changed = true;
        }

        if (!changed) {
            return 'unchanged';
        }
        existing.update_datetime = now;
        await repository.save(existing);
        return 'updated';
    }

    /**
     * Paged list filtered by period_from/to (YYYY-MM-DD strings),
     * minimum magnitude. Ordered newest-first.
     */
    public async findList(
        periodFrom: string | undefined,
        periodTo: string | undefined,
        minMagnitude: number | undefined,
        limit: number,
        offset: number
    ): Promise<{rows: Earthquake[]; count: number;}> {
        const repository = await this._repository;
        const where: FindOptionsWhere<Earthquake> = {};

        const from = (periodFrom ?? '').trim();
        const to = (periodTo ?? '').trim();
        if (from !== '' && to !== '') {
            where.event_time_ms = Between(Date.parse(`${from}T00:00:00Z`), Date.parse(`${to}T23:59:59Z`));
        } else if (from !== '') {
            where.event_time_ms = MoreThanOrEqual(Date.parse(`${from}T00:00:00Z`));
        } else if (to !== '') {
            where.event_time_ms = LessThanOrEqual(Date.parse(`${to}T23:59:59Z`));
        }
        if (minMagnitude !== undefined && Number.isFinite(minMagnitude)) {
            where.magnitude = Raw((alias) => `${alias} >= :m`, {m: minMagnitude});
        }

        const [rows, count] = await repository.findAndCount({
            where: where,
            order: {event_time_ms: 'DESC'},
            skip: offset,
            take: limit
        });
        return {rows: rows, count: count};
    }

    /**
     * Find earthquakes inside `bbox` that occurred in
     * `[timeFromMs, timeToMs]` and meet `minMag`. Used by the import
     * flow to find existing rows that should correlate with a newly
     * arrived sighting.
     */
    public async findByBboxAndTime(
        bbox: EarthquakeBbox,
        timeFromMs: number,
        timeToMs: number,
        minMag: number
    ): Promise<Earthquake[]> {
        const repository = await this._repository;
        return repository.find({
            where: {
                lat: Between(bbox.min_lat, bbox.max_lat),
                lon: Between(bbox.min_lon, bbox.max_lon),
                event_time_ms: Between(timeFromMs, timeToMs),
                magnitude: Raw((alias) => `${alias} >= :m`, {m: minMag})
            }
        });
    }

    /**
     * Load earthquakes by id list — used by the impact endpoint to
     * materialise the focus event(s) for the response.
     */
    public async findByIds(ids: number[]): Promise<Earthquake[]> {
        if (ids.length === 0) {
            return [];
        }
        const repository = await this._repository;
        return repository.find({where: {id: In(ids)}});
    }

    /**
     * Earthquakes whose `event_time_ms` falls within the given UTC
     * calendar day (00:00..23:59:59.999 UTC). Used by the impact
     * endpoint when the user enters a date rather than clicking a
     * single event.
     */
    public async findByDateUtc(dateIso: string, minMag: number): Promise<Earthquake[]> {
        const startMs = Date.parse(`${dateIso}T00:00:00Z`);
        if (!Number.isFinite(startMs)) {
            return [];
        }
        const endMs = startMs + (24 * 60 * 60 * 1000) - 1;
        const repository = await this._repository;
        return repository.find({
            where: {
                event_time_ms: Between(startMs, endMs),
                magnitude: Raw((alias) => `${alias} >= :m`, {m: minMag})
            }
        });
    }

}