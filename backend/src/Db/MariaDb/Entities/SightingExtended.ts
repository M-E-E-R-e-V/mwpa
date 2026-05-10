import {DBBaseEntityUnid} from 'figtree';
import {Column, Entity, Index} from 'typeorm';

/**
 * Per-sighting metadata produced by the background services
 * (DepthService, WeatherService). One row per sighting.
 *
 * Structured columns instead of the legacy name/data key-value pattern
 * — lets analytics/exports filter directly in SQL ("WHERE depth_m
 * BETWEEN 100 AND 500 AND sst_c_day > 18") without per-row casts. The
 * `*_last_update` DATETIME columns drive the refresh logic in the
 * services: a NULL or an old-enough value puts the sighting back into
 * the "pending" set on the next cron tick.
 */
@Entity({name: 'sighting_extended'})
export class SightingExtended extends DBBaseEntityUnid {

    /**
     * Owning sighting (logically 1:1 — see DedupeSightingExtendedSetup
     * which keeps this true at boot, and SightingExtendedRepository
     * which always upserts on this column).
     */
    @Index()
    @Column()
    public sighting_id!: number;

    /**
     * Sea depth in metres (positive). Null when the sighting is not in
     * the sea, the upstream had no value, or the lookup hasn't run yet.
     */
    @Column({
        type: 'int',
        nullable: true
    })
    public depth_m!: number | null;

    /**
     * Status of the depth lookup: '', 'ok', 'land', 'invalid_location',
     * 'no_data'. Empty = never tried.
     */
    @Column({
        type: 'varchar',
        length: 32,
        default: ''
    })
    public depth_status!: string;

    /**
     * When the depth lookup was last run for this sighting. NULL = never.
     */
    @Column({
        type: 'datetime',
        nullable: true
    })
    public depth_last_update!: Date | null;

    /**
     * Sea surface temperature, day mean (°C). Null when missing.
     */
    @Column({
        type: 'decimal',
        precision: 4,
        scale: 1,
        nullable: true
    })
    public sst_c_day!: number | null;

    /**
     * Sea surface temperature at the sighting hour (°C).
     */
    @Column({
        type: 'decimal',
        precision: 4,
        scale: 1,
        nullable: true
    })
    public sst_c_hour!: number | null;

    /**
     * 2 m air temperature, day mean (°C).
     */
    @Column({
        type: 'decimal',
        precision: 4,
        scale: 1,
        nullable: true
    })
    public air_temperature_c_day!: number | null;

    /**
     * 2 m air temperature at the sighting hour (°C).
     */
    @Column({
        type: 'decimal',
        precision: 4,
        scale: 1,
        nullable: true
    })
    public air_temperature_c_hour!: number | null;

    /**
     * UV index, day MAX (peak around solar noon). Day mean would be
     * diluted by night-time zeros so we keep the max instead.
     */
    @Column({
        type: 'decimal',
        precision: 3,
        scale: 1,
        nullable: true
    })
    public uv_index_day!: number | null;

    /**
     * UV index at the sighting hour.
     */
    @Column({
        type: 'decimal',
        precision: 3,
        scale: 1,
        nullable: true
    })
    public uv_index_hour!: number | null;

    /**
     * Significant wave height, day mean (m).
     */
    @Column({
        type: 'decimal',
        precision: 4,
        scale: 2,
        nullable: true
    })
    public wave_height_m_day!: number | null;

    /**
     * Significant wave height at the sighting hour (m).
     */
    @Column({
        type: 'decimal',
        precision: 4,
        scale: 2,
        nullable: true
    })
    public wave_height_m_hour!: number | null;

    /**
     * Wave period, day mean (s).
     */
    @Column({
        type: 'decimal',
        precision: 3,
        scale: 1,
        nullable: true
    })
    public wave_period_s_day!: number | null;

    /**
     * Wave period at the sighting hour (s).
     */
    @Column({
        type: 'decimal',
        precision: 3,
        scale: 1,
        nullable: true
    })
    public wave_period_s_hour!: number | null;

    /**
     * Wave direction, day circular mean (degrees, 0..359).
     */
    @Column({
        type: 'smallint',
        nullable: true
    })
    public wave_direction_deg_day!: number | null;

    /**
     * Wave direction at the sighting hour (degrees).
     */
    @Column({
        type: 'smallint',
        nullable: true
    })
    public wave_direction_deg_hour!: number | null;

    /**
     * Local-time hour of day (0..23) used for the *_hour samples. NULL
     * when no hour was known on the sighting.
     */
    @Column({
        type: 'tinyint',
        nullable: true
    })
    public weather_hour_used!: number | null;

    /**
     * Status of the weather lookup: '', 'ok', 'land',
     * 'invalid_location', 'invalid_date', 'no_data'.
     */
    @Column({
        type: 'varchar',
        length: 32,
        default: ''
    })
    public weather_status!: string;

    /**
     * When the weather lookup was last run. NULL = never.
     */
    @Column({
        type: 'datetime',
        nullable: true
    })
    public weather_last_update!: Date | null;

    /**
     * Per-column data provenance: maps a value column name (e.g.
     * 'depth_m', 'sst_c_day', 'wave_height_m_hour') to the provider id
     * that produced it (e.g. 'emodnet', 'noaa_etopo', 'open_meteo').
     *
     * Stored as JSON because the producing-provider can differ per
     * value (e.g. depth_m from emodnet, sst_c_day from open_meteo) and
     * the set of value columns is open-ended. Each service merges its
     * own keys into the existing map on write so the other service's
     * entries stay intact.
     *
     * NULL when nothing has been written yet.
     */
    @Column({
        type: 'simple-json',
        nullable: true
    })
    public provenance!: Record<string, string> | null;

}