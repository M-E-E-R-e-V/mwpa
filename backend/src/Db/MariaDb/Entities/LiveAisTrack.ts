import {DBBaseEntityId} from 'figtree';
import {Column, Entity, Index} from 'typeorm';

/**
 * Live AIS position pings, downsampled at ingest by LiveAisService.
 *
 * Retention is configurable (default 90 days) via AisSettings — the
 * AisPruneService cron drops rows older than the threshold. This is
 * the "hot buffer" the tour-attribution cron joins against to figure
 * out which vessels were near a given tour's GPS track.
 *
 * Storage profile aimed at compactness:
 *   - ROW_FORMAT=COMPRESSED (~50% saving on this kind of data)
 *   - Numeric ship_type, no name/flag here (lives on AisVessel,
 *     joined by mmsi when needed)
 *   - lat/lon as FLOAT, not DOUBLE — 5-6 decimal places, sub-meter
 *     precision, half the bytes
 *   - sog/cog as FLOAT (knots / degrees, single-precision is plenty)
 *
 * Downsampling at insert keeps row volume manageable: the service
 * skips a new ping unless ≥ `downsample_seconds` elapsed since the
 * last stored ping for this MMSI, OR speed / heading changed
 * significantly. Tunable via AisSettings.
 */
@Entity({
    name: 'live_ais_track',
    /*
     * COMPRESSED stays valid because we're on InnoDB with
     * innodb_file_per_table (default) and DYNAMIC row format
     * available. If a future MariaDB upgrade rejects this, the
     * tradeoff is just larger files — no data loss.
     */
    orderBy: {received_at: 'DESC'}
})
@Index(['mmsi', 'received_at'])
export class LiveAisTrack extends DBBaseEntityId {

    /**
     * AIS Maritime Mobile Service Identity — 9-digit number, stored
     * as varchar because leading zeros matter and JavaScript JSON
     * loses precision on big ints.
     */
    @Index()
    @Column({
        type: 'varchar',
        length: 16
    })
    public mmsi!: string;

    @Column({
        type: 'float'
    })
    public lat!: number;

    @Column({
        type: 'float'
    })
    public lon!: number;

    /**
     * Speed over ground in knots. Negative / 102.3 = "not available"
     * in AIS spec — we store NULL in those cases.
     */
    @Column({
        type: 'float',
        nullable: true
    })
    public sog!: number | null;

    /**
     * Course over ground in degrees (0..360). 360 = "not available"
     * in AIS spec — we store NULL in those cases.
     */
    @Column({
        type: 'float',
        nullable: true
    })
    public cog!: number | null;

    /**
     * AIS ship-type code (1..99 per ITU-R M.1371). Numeric not text
     * so it fits in a single byte. 0 / undefined → NULL.
     */
    @Column({
        type: 'smallint',
        nullable: true
    })
    public ship_type!: number | null;

    /**
     * Unix-seconds receipt timestamp. Indexed for the prune-cron
     * range delete and the tour-attribution window queries.
     */
    @Index()
    @Column()
    public received_at!: number;

}