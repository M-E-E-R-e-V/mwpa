import {DBBaseEntityId} from 'figtree';
import {Column, Entity, Index} from 'typeorm';

/**
 * One segment (point N → point N+1) of a {@link SightingMovement}.
 *
 * Ordering inside a movement is by `sequence_no` ascending. The first
 * segment has `turning_angle_deg = NULL` (no previous heading to compare
 * against). Outlier-flagged segments stay in the table with
 * `quality = 'bad'` so the front-end can grey them out instead of seeing
 * an unexplained gap.
 */
@Entity({name: 'sighting_movement_track'})
export class SightingMovementTrack extends DBBaseEntityId {

    /**
     * Owning {@link SightingMovement}. We index this rather than
     * sighting_id directly so the map API can pull all segments of a
     * movement with a single indexed lookup.
     */
    @Index()
    @Column({
        default: 0
    })
    public sighting_movement_id!: number;

    /**
     * Position of the segment inside the movement (0..N-1).
     */
    @Column({
        default: 0
    })
    public sequence_no!: number;

    /**
     * Start point of the segment. WGS84 decimal degrees.
     */
    @Column({type: 'double', default: 0})
    public start_lat!: number;

    @Column({type: 'double', default: 0})
    public start_lon!: number;

    @Column({type: 'double', default: 0})
    public end_lat!: number;

    @Column({type: 'double', default: 0})
    public end_lon!: number;

    /**
     * Unix-seconds timestamp of the start point. 0 when unknown (only
     * happens for `manual_begin_end` movements built from sightings
     * without timing data).
     */
    @Column({default: 0})
    public start_dt!: number;

    /**
     * Unix-seconds timestamp of the end point. 0 when unknown.
     */
    @Column({default: 0})
    public end_dt!: number;

    /**
     * Great-circle distance from start to end, in metres. Always ≥ 0.
     */
    @Column({type: 'double', default: 0})
    public distance_m!: number;

    /**
     * `end_dt - start_dt` in seconds. 0 for `manual_begin_end` segments
     * with no timing.
     */
    @Column({type: 'double', default: 0})
    public duration_s!: number;

    /**
     * `distance_m / duration_s` in m/s. NULL when duration_s is 0.
     */
    @Column({type: 'double', nullable: true})
    public speed_mps!: number | null;

    /**
     * Initial bearing from start to end (degrees, 0..360, 0 = North).
     * NULL only when the two points are identical (distance_m = 0).
     */
    @Column({type: 'double', nullable: true})
    public heading_deg!: number | null;

    /**
     * Signed change in heading vs the previous segment (degrees,
     * -180..180). NULL for sequence_no = 0 (no predecessor).
     */
    @Column({type: 'double', nullable: true})
    public turning_angle_deg!: number | null;

    /**
     * Outlier flag. `bad` = GPS jump suspected (speed exceeded the
     * configured cap). Segment is kept so callers see the gap but can
     * filter or render it differently.
     */
    @Index()
    @Column({
        type: 'varchar',
        length: 8,
        default: 'good'
    })
    public quality!: 'good' | 'bad';

}