import {DBBaseEntityUnid} from 'figtree';
import {Column, Entity, Index} from 'typeorm';

/**
 * Per-sighting commercial fishing-effort aggregate produced by the
 * FishingEffortService (currently fed by Global Fishing Watch).
 * Separate table from SightingExtended because:
 *
 *   - The data describes the *human* environment (AIS-derived vessel
 *     activity) rather than the *physical / biogeochemical* environment.
 *   - GFW data has its own licence and access constraints (free, but
 *     requires per-user token, with attribution); keeping it isolated
 *     makes it easy to drop, swap, or re-license per region.
 *   - The radii-based aggregates don't share dimensionality with the
 *     point-sample columns in SightingExtended, so co-locating them
 *     would only inflate the row width without any analytics benefit.
 *
 * One row per sighting_id (enforced by the service's upsert). NULL
 * values mean "lookup hasn't run yet" or "no fishing activity in the
 * window" — distinguished via `fishing_status`.
 */
@Entity({name: 'sighting_fishing_effort'})
export class SightingFishingEffort extends DBBaseEntityUnid {

    /**
     * Owning sighting (logically 1:1 — upsert keeps this true).
     */
    @Index()
    @Column()
    public sighting_id!: number;

    /**
     * Total commercial fishing hours observed inside a ~25 km radius
     * around the sighting on the sighting day. NULL = no lookup yet;
     * 0 = lookup ran but no activity found.
     */
    @Column({
        type: 'decimal',
        precision: 8,
        scale: 2,
        nullable: true
    })
    public fishing_hours_day_25km!: number | null;

    /**
     * Same, ~50 km radius. Useful for spotting regional pressure even
     * when no vessel was directly at the sighting point.
     */
    @Column({
        type: 'decimal',
        precision: 8,
        scale: 2,
        nullable: true
    })
    public fishing_hours_day_50km!: number | null;

    /**
     * Distinct AIS vessel count inside the ~25 km radius on the
     * sighting day. NULL = no lookup yet.
     */
    @Column({
        type: 'int',
        nullable: true
    })
    public vessel_count_day_25km!: number | null;

    /**
     * Gear type with the most fishing-hours inside the ~25 km radius
     * (e.g. 'trawlers', 'drifting_longlines', 'purse_seines',
     * 'tuna_purse_seines', 'set_longlines', 'fixed_gear'). NULL when
     * no vessels matched. Free-form because GFW occasionally adds new
     * categories.
     */
    @Column({
        type: 'varchar',
        length: 64,
        nullable: true
    })
    public top_gear_type!: string | null;

    /**
     * ISO-3 flag-state code with the most fishing-hours inside the
     * ~25 km radius (e.g. 'ESP', 'FRA', 'MAR'). NULL when no vessels
     * matched.
     */
    @Column({
        type: 'varchar',
        length: 8,
        nullable: true
    })
    public top_flag!: string | null;

    /**
     * Status of the fishing lookup: '', 'ok', 'no_data', 'land',
     * 'invalid_location', 'invalid_date', 'no_provider'. Empty = never
     * tried. 'no_provider' means no enabled provider in the registry
     * (e.g. GFW token missing) — the row is marked so we don't retry
     * every cron tick.
     */
    @Column({
        type: 'varchar',
        length: 32,
        default: ''
    })
    public fishing_status!: string;

    /**
     * When the fishing lookup was last run. NULL = never.
     */
    @Column({
        type: 'datetime',
        nullable: true
    })
    public fishing_last_update!: Date | null;

    /**
     * Per-column data provenance: maps a value column to the provider
     * id that produced it (e.g. {'fishing_hours_day_25km': 'gfw'}).
     * The GFW dataset version may also be recorded under a synthetic
     * key (e.g. 'gfw_dataset_version') so analytics can audit which
     * upstream release the value came from.
     *
     * NULL when nothing has been written yet.
     */
    @Column({
        type: 'simple-json',
        nullable: true
    })
    public provenance!: Record<string, string> | null;

}