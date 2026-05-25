import {DBBaseEntityId} from 'figtree';
import {Column, Entity, Index, Unique} from 'typeorm';

/**
 * Earthquake event imported from an external provider (USGS today;
 * EMSC planned). Uniqueness is enforced via `(source, source_event_id)`
 * — the provider's own stable id — so a backfill re-runs as upserts
 * rather than inserts. Lat/lon are stored as doubles for the bbox
 * filter; depth is nullable because some providers don't report it.
 */
@Entity({name: 'earthquake'})
@Unique('earthquake_source_event_uniq', ['source', 'source_event_id'])
export class Earthquake extends DBBaseEntityId {

    /**
     * Provider tag — 'usgs' for now; future expansion 'emsc'.
     */
    @Index()
    @Column({
        type: 'varchar',
        length: 16,
        default: 'usgs'
    })
    public source!: string;

    /**
     * Stable provider event id (e.g. USGS 'us7000abcd').
     */
    @Index()
    @Column({
        type: 'varchar',
        length: 64,
        default: ''
    })
    public source_event_id!: string;

    /**
     * Origin time, ms epoch UTC.
     */
    @Index()
    @Column({
        type: 'bigint',
        default: 0
    })
    public event_time_ms!: number;

    /**
     * Latitude (WGS-84 degrees).
     */
    @Index()
    @Column({
        type: 'double',
        default: 0
    })
    public lat!: number;

    /**
     * Longitude (WGS-84 degrees).
     */
    @Index()
    @Column({
        type: 'double',
        default: 0
    })
    public lon!: number;

    /**
     * Hypocenter depth in km. NULL when the provider omits it.
     */
    @Column({
        type: 'double',
        nullable: true
    })
    public depth_km!: number | null;

    /**
     * Magnitude (single combined value reported by the provider).
     */
    @Index()
    @Column({
        type: 'double',
        default: 0
    })
    public magnitude!: number;

    /**
     * Magnitude scale, e.g. 'ml', 'mw', 'mb'.
     */
    @Column({
        type: 'varchar',
        length: 16,
        default: ''
    })
    public magnitude_type!: string;

    /**
     * Free-form locality from provider, e.g. "12 km SW of Adeje".
     */
    @Column({
        type: 'varchar',
        length: 255,
        default: ''
    })
    public place!: string;

    /**
     * Provider's detail-page URL.
     */
    @Column({
        type: 'varchar',
        length: 512,
        default: ''
    })
    public url!: string;

    /**
     * Row create timestamp (s epoch). update_datetime updates on upsert.
     */
    @Index()
    @Column({
        default: 0
    })
    public create_datetime!: number;

    /**
     * Row update timestamp.
     */
    @Index()
    @Column({
        default: 0
    })
    public update_datetime!: number;

}