import {DBBaseEntityId} from 'figtree';
import {Column, Entity, Index} from 'typeorm';

/**
 * Sighting movement (header).
 *
 * Computed by {@link SightingMovementService} from the raw track points in
 * `sighting_tour_tracking` (or, when none exist, from the hand-entered
 * `location_begin`/`location_end` of the sighting). One row per sighting.
 *
 * Holds the aggregated track for fast map/API rendering — the per-segment
 * details live in `sighting_movement_track`. Rebuilding a sighting always
 * deletes the existing row + its tracks and re-writes them as a unit, so
 * this table is purely derived state.
 *
 * Lat/lon stored as DOUBLE (not POINT) on purpose — keeps TypeORM/MariaDB
 * out of the spatial-type rabbit hole. Frontend can render DOUBLEs
 * directly in OpenLayers, and a SPATIAL index can be added later without
 * touching the value columns.
 */
@Entity({name: 'sighting_movement'})
export class SightingMovement extends DBBaseEntityId {

    /**
     * Owning sighting (logically 1:1).
     */
    @Index()
    @Column()
    public sighting_id!: number;

    /**
     * Tour the sighting belongs to. Denormalised so the map API can filter
     * `WHERE sighting_tour_id = ?` without joining `sighting`.
     */
    @Index()
    @Column({
        default: 0
    })
    public sighting_tour_id!: number;

    /**
     * Where the segments came from:
     *  - `tracking`: built from sighting_tour_tracking points within the
     *    sighting's time window.
     *  - `manual_begin_end`: no track points available — fallback to a
     *    single segment between `location_begin` and `location_end`.
     *  - `hybrid`: reserved for future use (track points + hand anchors).
     */
    @Index()
    @Column({
        type: 'varchar',
        length: 32,
        default: 'tracking'
    })
    public source!: 'tracking' | 'manual_begin_end' | 'hybrid';

    /**
     * Number of `sighting_movement_track` rows attached to this movement.
     * Lets callers decide whether the track is rich enough to be worth
     * rendering without joining the child table.
     */
    @Column({
        default: 0
    })
    public segment_count!: number;

    /**
     * Sum of all segment distances in metres.
     */
    @Column({
        type: 'double',
        default: 0
    })
    public total_distance_m!: number;

    /**
     * Sum of all segment durations in seconds.
     */
    @Column({
        type: 'double',
        default: 0
    })
    public total_duration_s!: number;

    /**
     * Mean speed across the segments (m/s). 0 when total_duration_s is 0.
     */
    @Column({
        type: 'double',
        nullable: true
    })
    public avg_speed_mps!: number | null;

    /**
     * Peak segment speed (m/s). Filtered: outlier segments
     * (`quality = 'bad'`) are excluded so a single GPS jump can't blow
     * this up.
     */
    @Column({
        type: 'double',
        nullable: true
    })
    public max_speed_mps!: number | null;

    /**
     * Circular mean of segment headings (degrees, 0..360).
     */
    @Column({
        type: 'double',
        nullable: true
    })
    public dominant_heading_deg!: number | null;

    /**
     * Variance of segment headings (degrees²), as a rough proxy for how
     * straight vs erratic the track was. NULL when fewer than 2 segments.
     */
    @Column({
        type: 'double',
        nullable: true
    })
    public heading_variance_deg!: number | null;

    /**
     * Bounding box of the movement. NULL when the movement has no points.
     */
    @Column({
        type: 'double',
        nullable: true
    })
    public bbox_min_lat!: number | null;

    @Column({
        type: 'double',
        nullable: true
    })
    public bbox_min_lon!: number | null;

    @Column({
        type: 'double',
        nullable: true
    })
    public bbox_max_lat!: number | null;

    @Column({
        type: 'double',
        nullable: true
    })
    public bbox_max_lon!: number | null;

    /**
     * Unix-seconds timestamp of the first segment's start point.
     */
    @Index()
    @Column({
        default: 0
    })
    public first_dt!: number;

    /**
     * Unix-seconds timestamp of the last segment's end point.
     */
    @Index()
    @Column({
        default: 0
    })
    public last_dt!: number;

    /**
     * When this movement was (re)computed. Unix-seconds. Used to gate
     * lazy rebuild logic later (e.g. "older than sighting.update_datetime
     * → recompute").
     */
    @Column({
        default: 0
    })
    public computed_at!: number;

}