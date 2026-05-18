import {DBBaseEntityId} from 'figtree';
import {Column, Entity, Index, Unique} from 'typeorm';

/**
 * Permanent record of which AIS vessels were present during a tour.
 * Written once per (tour, vessel) by AisTourMatchService when the
 * tour finishes, then never modified — this is the historical
 * snapshot that survives even after LiveAisTrack rows for that
 * period have been pruned.
 *
 * Joins the boat's GPS track (sighting_tour_tracking) against the
 * live AIS buffer within the tour's spatio-temporal envelope; the
 * `closest_*` fields capture the closest approach between the two.
 *
 * Vessel name + flag are snapshotted from AisVessel at write time —
 * even if the vessel later renames, this row remains accurate for
 * historical reference.
 */
@Entity({name: 'tour_ais_vessel'})
@Unique(['tour_id', 'mmsi'])
export class TourAisVessel extends DBBaseEntityId {

    @Index()
    @Column()
    public tour_id!: number;

    @Index()
    @Column({
        type: 'varchar',
        length: 16
    })
    public mmsi!: string;

    /**
     * Snapshotted vessel name at the time of tour processing. Empty
     * when the AisVessel cache had no entry yet (static AIS message
     * hadn't been received by the time the tour ended).
     */
    @Column({
        type: 'varchar',
        length: 64,
        default: ''
    })
    public vessel_name!: string;

    @Column({
        type: 'varchar',
        length: 8,
        default: ''
    })
    public flag!: string;

    @Column({
        type: 'smallint',
        nullable: true
    })
    public ship_type!: number | null;

    /**
     * Number of (downsampled) pings inside the tour's
     * spatio-temporal window. Coarse "how long was it around" metric.
     */
    @Column()
    public n_pings!: number;

    /**
     * Closest approach distance in metres — minimum over all
     * (vessel-ping, tour-track-point) pairs whose timestamps are
     * within the configured time tolerance.
     */
    @Column()
    public closest_distance_m!: number;

    /**
     * Unix-seconds timestamp of the vessel ping at the closest
     * approach.
     */
    @Column()
    public closest_at!: number;

    /**
     * Mean speed over ground (knots) across the in-window pings,
     * computed at attribution time.
     */
    @Column({
        type: 'float',
        nullable: true
    })
    public avg_sog!: number | null;

    /**
     * True when the vessel's course-over-ground varied by more than
     * `ais_course_change_threshold_deg` (default 30°) inside the
     * window — useful signal for "did the vessel react to the
     * whale-watching boat".
     */
    @Column({
        default: false
    })
    public course_changed!: boolean;

    /**
     * Unix-seconds timestamp of the attribution write. Lets the cron
     * detect already-processed tours via `WHERE processed_at = 0`.
     */
    @Column()
    public created_at!: number;

}