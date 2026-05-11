import {Logger} from 'figtree';
import moment from 'moment-timezone';
import {Sighting} from '../../Db/MariaDb/Entities/Sighting.js';
import {SightingMovement} from '../../Db/MariaDb/Entities/SightingMovement.js';
import {SightingMovementTrack} from '../../Db/MariaDb/Entities/SightingMovementTrack.js';
import {SightingTourTracking} from '../../Db/MariaDb/Entities/SightingTourTracking.js';
import {SightingMovementRepository} from '../../Db/MariaDb/Repositories/SightingMovementRepository.js';
import {SightingMovementTrackRepository} from '../../Db/MariaDb/Repositories/SightingMovementTrackRepository.js';
import {SightingRepository} from '../../Db/MariaDb/Repositories/SightingRepository.js';
import {SightingTourTrackingRepository} from '../../Db/MariaDb/Repositories/SightingTourTrackingRepository.js';
import {MovementConfig, SightingMovementConfig} from './SightingMovementConfig.js';

const EARTH_RADIUS_M = 6_371_000;
const DEG = Math.PI / 180;
const RAD = 180 / Math.PI;

type LatLon = {lat: number; lon: number};

/**
 * Parsed `location_begin`/`location_end` payload — same shape the mobile
 * captures via `navigator.geolocation`. `ts_sec` is the GPS-capture
 * moment in Unix-seconds (derived from the JSON's `timestamp` ms field).
 * `null` when the import lacked the timestamp.
 */
type LocationFix = {lat: number; lon: number; ts_sec: number | null};

type RebuildStats = {
    processed: number;
    failed: number;
    skipped: number;
};

/**
 * One point feeding the segment builder: position + optional timestamp.
 * Tracking points always have a timestamp; the `manual_begin_end`
 * fallback has 0 (= unknown) so the resulting segment carries no
 * duration/speed.
 */
type RawPoint = {
    lat: number;
    lon: number;
    dt: number;
};

/**
 * Per-sighting (re)builder for {@link SightingMovement} / {@link
 * SightingMovementTrack}. Pure derived state — every rebuild deletes
 * the existing rows for that sighting and writes fresh ones.
 *
 * Designed to be safe to call repeatedly; runs in the background after
 * sighting/tracking saves (see Phase 2 wiring) and on demand via the
 * admin reprocess endpoint.
 *
 * Triggers itself do **not** roll back the parent transaction on
 * failure — derived analytics shouldn't block a user's save.
 */
export class SightingMovementService {

    /**
     * Process-wide instance reused by every hook (sighting save, mobile
     * tracking sync, admin rebuild). Sharing one instance preserves the
     * {@link SightingMovementConfig} cache so we don't hit the DB for
     * tunables on every save.
     */
    private static _instance: SightingMovementService | null = null;

    public static getInstance(): SightingMovementService {
        if (SightingMovementService._instance === null) {
            SightingMovementService._instance = new SightingMovementService();
        }
        return SightingMovementService._instance;
    }

    private readonly _config: SightingMovementConfig;

    public constructor(config?: SightingMovementConfig) {
        this._config = config ?? new SightingMovementConfig();
    }

    /**
     * Hand out the underlying config reader so the admin routes can
     * read + write the persisted MovementConfig through the same cache
     * the service itself uses (a save here invalidates the cache, so
     * the next rebuild picks up the new values without a restart).
     */
    public getConfigReader(): SightingMovementConfig {
        return this._config;
    }

    /**
     * Recompute the movement + segments for a single sighting. Logs and
     * swallows errors so callers in user-facing paths (Sighting/Save)
     * don't block on derived analytics.
     */
    public async rebuildForSighting(sightingId: number): Promise<void> {
        try {
            await this._rebuildOne(sightingId);
        } catch (e) {
            Logger.getLogger().error(
                `SightingMovementService: rebuild failed for sighting ${sightingId}`,
                e as Error
            );
        }
    }

    /**
     * Recompute movements for every (non-deleted) sighting of a tour.
     * Returns aggregate counts so the mobile tracking-sync hook can log
     * how many sightings it affected.
     */
    public async rebuildForTour(tourId: number): Promise<RebuildStats> {
        const stats: RebuildStats = {processed: 0, failed: 0, skipped: 0};

        const sightingRepo = await SightingRepository.getInstance().getRepository();
        const sightings = await sightingRepo.find({
            where: {tour_id: tourId, deleted: false},
            select: ['id']
        });

        for await (const s of sightings) {
            try {
                await this._rebuildOne(s.id);
                stats.processed += 1;
            } catch (e) {
                stats.failed += 1;
                Logger.getLogger().error(
                    `SightingMovementService: rebuild failed for sighting ${s.id} on tour ${tourId}`,
                    e as Error
                );
            }
        }

        return stats;
    }

    /**
     * Recompute every (non-deleted) sighting's movement. Iterates in id
     * order in chunks so a very large dataset doesn't load every
     * sighting into memory at once. Returns aggregate counts.
     *
     * Also sweeps orphans at the end: movement rows whose sighting no
     * longer exists, has been deleted, or has lost its species. Those
     * accumulate over time because the per-row save/delete hooks only
     * fire on actively-edited sightings.
     */
    public async rebuildAll(
        progressCb?: (done: number, total: number) => void
    ): Promise<RebuildStats> {
        const stats: RebuildStats = {processed: 0, failed: 0, skipped: 0};
        const repo = await SightingRepository.getInstance().getRepository();
        const total = await repo.count({where: {deleted: false}});

        const CHUNK = 500;
        let lastId = 0;

        // Stream sightings in id ASC chunks of CHUNK rows. The "id > lastId"
        // cursor keeps the working set bounded regardless of table size.
        // eslint-disable-next-line no-constant-condition
        while (true) {
            const chunk = await repo
                .createQueryBuilder('s')
                .select(['s.id'])
                .where('s.deleted = :deleted', {deleted: false})
                .andWhere('s.id > :lastId', {lastId})
                .orderBy('s.id', 'ASC')
                .limit(CHUNK)
                .getMany();

            if (chunk.length === 0) {
                break;
            }

            for await (const s of chunk) {
                try {
                    await this._rebuildOne(s.id);
                    stats.processed += 1;
                } catch (e) {
                    stats.failed += 1;
                    Logger.getLogger().error(
                        `SightingMovementService: rebuild failed for sighting ${s.id}`,
                        e as Error
                    );
                }

                lastId = s.id;
                if (progressCb) {
                    progressCb(stats.processed + stats.failed, total);
                }
            }
        }

        const orphans = await this._cleanupOrphans();
        if (orphans > 0) {
            Logger.getLogger().info(
                `SightingMovementService: cleaned up ${orphans} orphan movement rows`
            );
        }

        return stats;
    }

    /**
     * Delete movement rows whose owning sighting is missing, deleted, or
     * has no species set. Such rows accumulate when a sighting was
     * deleted before the delete-hook existed, or when a sighting's
     * species was cleared after the row had already been built.
     *
     * Returns the number of movements that got removed.
     */
    private async _cleanupOrphans(): Promise<number> {
        const movementRepoRaw = await SightingMovementRepository.getInstance().getRepository();
        const sightingRepoRaw = await SightingRepository.getInstance().getRepository();

        const movements = await movementRepoRaw
            .createQueryBuilder('m')
            .select(['m.id', 'm.sighting_id'])
            .getMany();

        if (movements.length === 0) {
            return 0;
        }

        const sightingIds = Array.from(new Set(movements.map((m) => m.sighting_id)));
        const sightings = await sightingRepoRaw
            .createQueryBuilder('s')
            .select(['s.id', 's.deleted', 's.species_id'])
            .where('s.id IN (:...ids)', {ids: sightingIds})
            .getMany();

        const validIds = new Set<number>();
        for (const s of sightings) {
            if (!s.deleted && s.species_id > 0) {
                validIds.add(s.id);
            }
        }

        let removed = 0;
        for (const m of movements) {
            if (!validIds.has(m.sighting_id)) {
                await this._dropExisting(m.sighting_id);
                removed += 1;
            }
        }

        return removed;
    }

    /**
     * Discard the cached settings. Call after the admin UI persists a
     * new config so subsequent rebuilds use the fresh values.
     */
    public reloadConfig(): void {
        this._config.reload();
    }

    // ────────────────────────────────────────────────────────────────
    // Internals
    // ────────────────────────────────────────────────────────────────

    private async _rebuildOne(sightingId: number): Promise<void> {
        const sightingRepo = await SightingRepository.getInstance().getRepository();
        const sighting = await sightingRepo.findOne({where: {id: sightingId}});

        if (sighting === null) {
            Logger.getLogger().info(
                `SightingMovementService: sighting ${sightingId} not found, dropping any stale movement row`
            );
            await this._dropExisting(sightingId);
            return;
        }

        if (sighting.deleted) {
            // Deleted sightings keep no derived state.
            await this._dropExisting(sightingId);
            return;
        }

        // Only sightings with a real species set deserve a movement record.
        // Type-only entries (notice / short / draft without species) just
        // pollute the map; if a user later picks a species the save hook
        // triggers another rebuild that will create the row.
        if (sighting.species_id <= 0) {
            await this._dropExisting(sightingId);
            return;
        }

        const config = await this._config.get();
        const points = await this._collectPoints(sighting, config);

        // Drop any prior movement/tracks before writing the new set —
        // keeps the table 1:1 with no leftover orphans.
        await this._dropExisting(sightingId);

        if (points.points.length === 0) {
            // Neither tracking points nor a valid begin/end — nothing to
            // persist. Caller can detect this by the absence of the row.
            return;
        }

        const segments = SightingMovementService._buildSegments(
            points.points,
            config.outlier_speed_kmh
        );
        const aggregates = SightingMovementService._buildAggregates(segments);

        const movement = new SightingMovement();
        movement.sighting_id = sighting.id;
        movement.sighting_tour_id = sighting.tour_id;
        movement.source = points.source;
        movement.segment_count = segments.length;
        movement.total_distance_m = aggregates.total_distance_m;
        movement.total_duration_s = aggregates.total_duration_s;
        movement.avg_speed_mps = aggregates.avg_speed_mps;
        movement.max_speed_mps = aggregates.max_speed_mps;
        movement.dominant_heading_deg = aggregates.dominant_heading_deg;
        movement.heading_variance_deg = aggregates.heading_variance_deg;
        movement.bbox_min_lat = aggregates.bbox_min_lat;
        movement.bbox_min_lon = aggregates.bbox_min_lon;
        movement.bbox_max_lat = aggregates.bbox_max_lat;
        movement.bbox_max_lon = aggregates.bbox_max_lon;
        movement.first_dt = aggregates.first_dt;
        movement.last_dt = aggregates.last_dt;
        movement.computed_at = Math.floor(Date.now() / 1000);

        const savedMovement = await SightingMovementRepository.getInstance().save(movement);

        const trackRepoRaw = await SightingMovementTrackRepository.getInstance().getRepository();
        const rows: SightingMovementTrack[] = segments.map((seg, idx) => {
            const t = new SightingMovementTrack();
            t.sighting_movement_id = savedMovement.id;
            t.sequence_no = idx;
            t.start_lat = seg.start_lat;
            t.start_lon = seg.start_lon;
            t.end_lat = seg.end_lat;
            t.end_lon = seg.end_lon;
            t.start_dt = seg.start_dt;
            t.end_dt = seg.end_dt;
            t.distance_m = seg.distance_m;
            t.duration_s = seg.duration_s;
            t.speed_mps = seg.speed_mps;
            t.heading_deg = seg.heading_deg;
            t.turning_angle_deg = seg.turning_angle_deg;
            t.quality = seg.quality;
            return t;
        });

        if (rows.length > 0) {
            await trackRepoRaw.save(rows);
        }
    }

    private async _dropExisting(sightingId: number): Promise<void> {
        const movement = await SightingMovementRepository.getInstance().findOneBySighting(sightingId);
        if (movement) {
            await SightingMovementTrackRepository.getInstance().deleteByMovement(movement.id);
            await SightingMovementRepository.getInstance().deleteBySighting(sightingId);
        }
    }

    /**
     * Resolve the time window for the sighting, pull tracking points
     * within it, and fall back to begin/end positions when no track
     * exists. Returns the points already sorted by time + the source tag.
     */
    private async _collectPoints(
        sighting: Sighting,
        config: MovementConfig
    ): Promise<{points: RawPoint[]; source: 'tracking' | 'manual_begin_end' | 'hybrid'}> {
        const beginFix = SightingMovementService._parseLocation(sighting.location_begin);
        const endFix = SightingMovementService._parseLocation(sighting.location_end);

        if (sighting.tour_id > 0) {
            const window = SightingMovementService._resolveWindow(sighting, config, beginFix, endFix);

            if (window !== null) {
                const tracking = await SightingTourTrackingRepository.getInstance().findByTour(sighting.tour_id);
                const points = SightingMovementService._filterAndParseTrackingPoints(
                    tracking,
                    window.from,
                    window.to
                );

                if (points.length >= 2) {
                    return {points: points, source: 'tracking'};
                }
            }
        }

        // Fallback: hand-entered begin/end positions on the sighting.
        // Carry the GPS-capture timestamps if the payload had them, so
        // the resulting single-segment movement still gets a real
        // duration/speed and shows up correctly on the time axis.
        const begin = beginFix;
        const end = endFix;
        const points: RawPoint[] = [];

        if (begin) {
            points.push({lat: begin.lat, lon: begin.lon, dt: begin.ts_sec ?? 0});
        }
        if (end && (begin === null || end.lat !== begin.lat || end.lon !== begin.lon)) {
            points.push({lat: end.lat, lon: end.lon, dt: end.ts_sec ?? 0});
        }

        return {points, source: 'manual_begin_end'};
    }

    /**
     * Compute [from, to] Unix-seconds for the sighting.
     *
     * Order of preference:
     *  1. `location_begin.timestamp` + `location_end.timestamp` — the
     *     mobile records these as `Date.now()` (UTC ms) at the moment
     *     the GPS fix was taken. Same clock source as the tracking
     *     points, so the window aligns with the actual tour leg the
     *     sighting was recorded on, independent of any HH:MM / TZ
     *     ambiguity.
     *  2. `duration_from` + `duration_until` parsed against
     *     `sighting.date` in `config.default_local_tz` (default
     *     `Atlantic/Canary`). Used for CSV-imported sightings that lack
     *     the GPS timestamp. Pre-2026-05-11 this path parsed in the
     *     Node-process TZ (UTC in Docker), which silently shifted the
     *     window by 1h during DST and landed tracks in the wrong stretch
     *     of the tour. The configured zone makes that deterministic.
     *
     * `create_datetime` is **not** a fallback: it records when the row
     * was inserted (= mobile sync time, often hours after the actual
     * sighting), so using it would reliably mis-target the window.
     *
     * Returns null when no valid window can be built — caller then
     * falls back to `source = 'manual_begin_end'`.
     */
    private static _resolveWindow(
        sighting: Sighting,
        config: MovementConfig,
        beginFix: LocationFix | null,
        endFix: LocationFix | null
    ): {from: number; to: number} | null {
        const lead = config.default_lead_minutes * 60;
        const trail = config.default_trail_minutes * 60;
        const widen = config.prefer_sighting_duration;

        // Primary path: GPS-fix timestamps (UTC ms, TZ-free).
        if (beginFix?.ts_sec != null && endFix?.ts_sec != null) {
            const fromTs = Math.min(beginFix.ts_sec, endFix.ts_sec);
            const toTs = Math.max(beginFix.ts_sec, endFix.ts_sec);
            return widen
                ? {from: fromTs - lead, to: toTs + trail}
                : {from: fromTs, to: toTs};
        }

        // Single-timestamp path: widen using the configured buffer on
        // both sides since we have no upper bound from the data.
        if (beginFix?.ts_sec != null) {
            const ts = beginFix.ts_sec;
            return {from: ts - lead, to: ts + trail};
        }
        if (endFix?.ts_sec != null) {
            const ts = endFix.ts_sec;
            return {from: ts - lead, to: ts + trail};
        }

        // Legacy path: HH:MM strings interpreted in config.default_local_tz.
        const fromExact = SightingMovementService._parseDateTime(
            sighting.date,
            sighting.duration_from,
            config.default_local_tz
        );
        const toExact = SightingMovementService._parseDateTime(
            sighting.date,
            sighting.duration_until,
            config.default_local_tz
        );

        if (fromExact === null || toExact === null || toExact < fromExact) {
            return null;
        }

        return widen
            ? {from: fromExact - lead, to: toExact + trail}
            : {from: fromExact, to: toExact};
    }

    /**
     * Combine a YYYY-MM-DD date with a HH:MM time-of-day into a
     * Unix-seconds timestamp, treating the wall-clock time as local to
     * `timezone` (an IANA zone like `Atlantic/Canary`). Returns null if
     * either input is empty or unparseable.
     */
    private static _parseDateTime(date: string, hhmm: string, timezone: string): number | null {
        if (!date || !hhmm) {
            return null;
        }

        const m = moment.tz(`${date.trim()} ${hhmm.trim()}`, 'YYYY-MM-DD HH:mm', true, timezone);
        if (!m.isValid()) {
            return null;
        }

        return Math.floor(m.valueOf() / 1000);
    }

    /**
     * Parse the tracking-point `position` text column. Mirrors
     * `parsePosition` in CreateExport — accepts `{latitude, longitude}`
     * with numeric values and rejects anything else.
     */
    private static _parsePosition(raw: string): LatLon | null {
        if (!raw) {
            return null;
        }

        try {
            const data = JSON.parse(raw);
            if (data && typeof data.latitude === 'number' && typeof data.longitude === 'number') {
                const lat = data.latitude as number;
                const lon = data.longitude as number;
                if (Number.isFinite(lat) && Number.isFinite(lon)) {
                    return {lat, lon};
                }
            }
        } catch {
            // fallthrough
        }
        return null;
    }

    /**
     * Parse a sighting's `location_begin` / `location_end` JSON column.
     * Returns lat/lon plus the GPS-capture timestamp (when present in
     * the JSON, mobile-style `{timestamp: <ms>}`). Returns null when the
     * payload has no usable lat/lon.
     */
    private static _parseLocation(raw: string): LocationFix | null {
        const pos = SightingMovementService._parsePosition(raw);
        if (pos === null) {
            return null;
        }

        let ts_sec: number | null = null;
        try {
            const data = JSON.parse(raw);
            if (data && typeof data.timestamp === 'number') {
                const ms = data.timestamp as number;
                if (Number.isFinite(ms) && ms > 0) {
                    ts_sec = Math.floor(ms / 1000);
                }
            }
        } catch {
            // already covered by _parsePosition swallowing the error
        }

        return {lat: pos.lat, lon: pos.lon, ts_sec};
    }

    /**
     * Filter tracking rows down to the window, parse each one, drop
     * unparseable rows, and sort by timestamp ascending. Stable sort
     * isn't strictly required (same-second pings are rare), but it
     * keeps insert order deterministic for tests.
     */
    private static _filterAndParseTrackingPoints(
        rows: SightingTourTracking[],
        from: number,
        to: number
    ): RawPoint[] {
        const out: RawPoint[] = [];

        for (const row of rows) {
            if (row.create_datetime < from || row.create_datetime > to) {
                continue;
            }
            const pos = SightingMovementService._parsePosition(row.position);
            if (pos === null) {
                continue;
            }
            out.push({lat: pos.lat, lon: pos.lon, dt: row.create_datetime});
        }

        out.sort((a, b) => a.dt - b.dt);
        return out;
    }

    /**
     * Walk the points sequence, build a segment for every consecutive
     * pair, mark too-fast segments as bad. Headings + turning angles
     * fall out as a side-effect of the walk.
     */
    private static _buildSegments(
        points: RawPoint[],
        outlierSpeedKmh: number
    ): {
        start_lat: number;
        start_lon: number;
        end_lat: number;
        end_lon: number;
        start_dt: number;
        end_dt: number;
        distance_m: number;
        duration_s: number;
        speed_mps: number | null;
        heading_deg: number | null;
        turning_angle_deg: number | null;
        quality: 'good' | 'bad';
    }[] {
        const outlierMps = outlierSpeedKmh * 1000 / 3600;
        const segments: ReturnType<typeof SightingMovementService._buildSegments> = [];

        let prevHeading: number | null = null;

        for (let i = 1; i < points.length; i += 1) {
            const a = points[i - 1];
            const b = points[i];

            const distance = SightingMovementService._haversine(a, b);
            const duration = b.dt > 0 && a.dt > 0 ? Math.max(0, b.dt - a.dt) : 0;
            const heading = distance > 0 ? SightingMovementService._bearing(a, b) : null;
            const speed = duration > 0 ? distance / duration : null;

            const turning = (heading !== null && prevHeading !== null)
                ? SightingMovementService._normaliseAngle(heading - prevHeading)
                : null;

            const quality: 'good' | 'bad' = speed !== null && speed > outlierMps ? 'bad' : 'good';

            segments.push({
                start_lat: a.lat,
                start_lon: a.lon,
                end_lat: b.lat,
                end_lon: b.lon,
                start_dt: a.dt,
                end_dt: b.dt,
                distance_m: distance,
                duration_s: duration,
                speed_mps: speed,
                heading_deg: heading,
                turning_angle_deg: turning,
                quality
            });

            if (heading !== null) {
                prevHeading = heading;
            }
        }

        return segments;
    }

    /**
     * Roll up the per-segment values into the SightingMovement header.
     * Excludes `quality = 'bad'` segments from speed/heading aggregates
     * but still counts their distance + duration (we don't want a GPS
     * jump to silently lower the trip's total either).
     */
    private static _buildAggregates(
        segments: ReturnType<typeof SightingMovementService._buildSegments>
    ): {
        total_distance_m: number;
        total_duration_s: number;
        avg_speed_mps: number | null;
        max_speed_mps: number | null;
        dominant_heading_deg: number | null;
        heading_variance_deg: number | null;
        bbox_min_lat: number | null;
        bbox_min_lon: number | null;
        bbox_max_lat: number | null;
        bbox_max_lon: number | null;
        first_dt: number;
        last_dt: number;
    } {
        let totalDistance = 0;
        let totalDuration = 0;
        let maxSpeed: number | null = null;
        let firstDt = 0;
        let lastDt = 0;
        let minLat: number | null = null;
        let minLon: number | null = null;
        let maxLat: number | null = null;
        let maxLon: number | null = null;

        let sumSin = 0;
        let sumCos = 0;
        let headingCount = 0;
        const headings: number[] = [];

        for (const seg of segments) {
            totalDistance += seg.distance_m;
            totalDuration += seg.duration_s;

            if (firstDt === 0 || (seg.start_dt > 0 && seg.start_dt < firstDt)) {
                firstDt = seg.start_dt;
            }
            if (seg.end_dt > lastDt) {
                lastDt = seg.end_dt;
            }

            for (const [lat, lon] of [[seg.start_lat, seg.start_lon], [seg.end_lat, seg.end_lon]]) {
                if (minLat === null || lat < minLat) minLat = lat;
                if (maxLat === null || lat > maxLat) maxLat = lat;
                if (minLon === null || lon < minLon) minLon = lon;
                if (maxLon === null || lon > maxLon) maxLon = lon;
            }

            if (seg.quality === 'bad') {
                continue;
            }

            if (seg.speed_mps !== null) {
                if (maxSpeed === null || seg.speed_mps > maxSpeed) {
                    maxSpeed = seg.speed_mps;
                }
            }

            if (seg.heading_deg !== null) {
                const rad = seg.heading_deg * DEG;
                sumSin += Math.sin(rad);
                sumCos += Math.cos(rad);
                headingCount += 1;
                headings.push(seg.heading_deg);
            }
        }

        const avgSpeed = totalDuration > 0 ? totalDistance / totalDuration : null;

        let dominantHeading: number | null = null;
        let headingVariance: number | null = null;

        if (headingCount > 0) {
            // Circular mean — sum of unit vectors, then atan2 back to degrees in 0..360.
            const meanRad = Math.atan2(sumSin / headingCount, sumCos / headingCount);
            dominantHeading = ((meanRad * RAD) + 360) % 360;

            if (headingCount > 1) {
                // Approximate variance via the minimum angular distance to
                // the circular mean — enough for the "straight vs erratic"
                // proxy we use it for.
                let varSum = 0;
                for (const h of headings) {
                    const d = SightingMovementService._normaliseAngle(h - dominantHeading);
                    varSum += d * d;
                }
                headingVariance = varSum / headingCount;
            }
        }

        return {
            total_distance_m: totalDistance,
            total_duration_s: totalDuration,
            avg_speed_mps: avgSpeed,
            max_speed_mps: maxSpeed,
            dominant_heading_deg: dominantHeading,
            heading_variance_deg: headingVariance,
            bbox_min_lat: minLat,
            bbox_min_lon: minLon,
            bbox_max_lat: maxLat,
            bbox_max_lon: maxLon,
            first_dt: firstDt,
            last_dt: lastDt
        };
    }

    /**
     * Great-circle distance in metres between two WGS84 points.
     * Spherical-earth haversine — accurate to ~0.5% which is fine for
     * the segment scale we operate on.
     */
    private static _haversine(a: LatLon, b: LatLon): number {
        const φ1 = a.lat * DEG;
        const φ2 = b.lat * DEG;
        const dφ = (b.lat - a.lat) * DEG;
        const dλ = (b.lon - a.lon) * DEG;

        const s = Math.sin(dφ / 2);
        const t = Math.sin(dλ / 2);
        const h = s * s + Math.cos(φ1) * Math.cos(φ2) * t * t;

        return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)));
    }

    /**
     * Initial bearing (forward azimuth) from A to B in degrees, 0..360,
     * 0 = North. Caller must check that the two points differ — for
     * identical points the bearing is undefined.
     */
    private static _bearing(a: LatLon, b: LatLon): number {
        const φ1 = a.lat * DEG;
        const φ2 = b.lat * DEG;
        const dλ = (b.lon - a.lon) * DEG;

        const y = Math.sin(dλ) * Math.cos(φ2);
        const x = Math.cos(φ1) * Math.sin(φ2)
            - Math.sin(φ1) * Math.cos(φ2) * Math.cos(dλ);

        return ((Math.atan2(y, x) * RAD) + 360) % 360;
    }

    /**
     * Wrap an angular difference into (-180, 180].
     */
    private static _normaliseAngle(deg: number): number {
        let d = deg % 360;
        if (d > 180) d -= 360;
        if (d <= -180) d += 360;
        return d;
    }

}