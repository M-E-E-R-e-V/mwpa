import {DBBaseEntityId} from 'figtree';
import {Column, Entity, Index, Unique} from 'typeorm';

/**
 * Per-vessel breakdown of GFW apparent fishing hours inside a
 * sighting's 25 km buffer on the sighting day.
 *
 * One row per (sighting, vessel). The aggregated values (sum, count,
 * top_gear, top_flag) live on `sighting_fishing_effort` — this
 * table is the raw per-vessel detail behind those aggregates, so the
 * UI can answer "which vessels exactly were there".
 *
 * Refresh model: written by FishingEffortService alongside the
 * aggregate row. On a re-pull (manual `fishing_last_update = NULL`),
 * the previous detail rows for that sighting are wiped + re-written —
 * GFW's per-vessel list can change between reanalysis runs.
 *
 * Vessel metadata (`name`, `mmsi`) is filled lazily from
 * `/vessels/{id}` on a later cron pass to avoid blowing the per-tick
 * budget; an empty `name` means "not yet enriched", not "missing".
 */
@Entity({name: 'sighting_fishing_vessel'})
@Unique(['sighting_id', 'vessel_id'])
export class SightingFishingVessel extends DBBaseEntityId {

    @Index()
    @Column()
    public sighting_id!: number;

    /**
     * GFW vessel id (stable across reports, stringified for
     * provider-agnostic identity — future non-GFW providers may use
     * different shapes).
     */
    @Index()
    @Column({
        type: 'varchar',
        length: 128
    })
    public vessel_id!: string;

    /**
     * Vessel name. Empty when the GFW `/vessels/{id}` enrichment
     * hasn't run yet — the row is still useful (id+flag+gear+hours).
     */
    @Column({
        type: 'varchar',
        length: 255,
        default: ''
    })
    public name!: string;

    @Column({
        type: 'varchar',
        length: 32,
        default: ''
    })
    public mmsi!: string;

    /**
     * ISO-3 country code from GFW (ESP, MAR, JPN, ...).
     */
    @Column({
        type: 'varchar',
        length: 8,
        default: ''
    })
    public flag!: string;

    /**
     * GFW gear-type code (trawlers, longliners, purse_seines,
     * drifting_longlines, ...). May be empty when GFW can't classify.
     */
    @Index()
    @Column({
        type: 'varchar',
        length: 64,
        default: ''
    })
    public gear_type!: string;

    /**
     * Apparent fishing hours this vessel logged inside the 25 km
     * buffer on the sighting day.
     */
    @Column({
        type: 'double',
        default: 0
    })
    public hours!: number;

    /**
     * Unix-seconds timestamp of the last successful write. Used to
     * detect stale rows the next time the sighting is re-pulled.
     */
    @Column({
        default: 0
    })
    public last_updated_at!: number;

}