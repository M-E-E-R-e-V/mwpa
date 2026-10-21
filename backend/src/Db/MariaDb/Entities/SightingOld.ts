import {DBBaseEntityId} from '@stefanwerfling/figtree';
import {Column, Entity, Index} from 'typeorm';

/**
 * SightingOld — historical, hand-maintained sightings imported once from a
 * legacy spreadsheet export (the `data_fusion` sheet, 1995 → pre-/early-app).
 *
 * Deliberately a SEPARATE table from `sighting` (which stays untouched) but
 * SHAPED IDENTICALLY so the list route + DTO can treat both uniformly and a
 * UNION query can stream them into one list. Rows are flagged `is_old` on the
 * API side (not stored here). All columns carry defaults because the old
 * hand-records populate only a subset — e.g. only ~29% have coordinates, and
 * trip start/end + behaviour are essentially empty.
 *
 * The extra `*_name` / `source_*` / `depth_m` columns hold what the old data
 * carries but the app model doesn't: boat/skipper as free text (no
 * vehicle/driver ids back then), the raw species string when it couldn't be
 * resolved to a species_id, the hand-recorded depth, and import provenance
 * (file + original row number, used as the idempotency key).
 *
 * Old rows are read-only in the UI (no mobile sync, no hashes, no tracks).
 */
@Entity({name: 'sighting_old'})
export class SightingOld extends DBBaseEntityId {

    @Index()
    @Column({default: ''})
    public unid!: string;

    @Index()
    @Column({default: 0})
    public creater_id!: number;

    @Index()
    @Column({default: 0})
    public create_datetime!: number;

    @Index()
    @Column({default: 0})
    public update_datetime!: number;

    @Index()
    @Column({default: 0})
    public device_id!: number;

    @Index()
    @Column({default: 0})
    public vehicle_id!: number;

    @Index()
    @Column({default: 0})
    public vehicle_driver_id!: number;

    @Index()
    @Column({default: 0})
    public beaufort_wind!: number;

    @Index()
    @Column({
        charset: 'utf8mb4',
        collation: 'utf8mb4_unicode_ci',
        default: ''
    })
    public beaufort_wind_n!: string;

    @Column({default: ''})
    public date!: string;

    @Index()
    @Column({default: 0})
    public tour_id!: number;

    @Index()
    @Column({default: ''})
    public tour_fid!: string;

    @Column({default: ''})
    public tour_start!: string;

    @Column({default: ''})
    public tour_end!: string;

    @Column({default: ''})
    public duration_from!: string;

    @Column({default: ''})
    public duration_until!: string;

    /**
     * Location begin as JSON `{latitude, longitude}` (like Sighting), or ''
     * when the old row had no coordinates (~71% of rows).
     */
    @Column({
        type: 'text',
        charset: 'utf8mb4',
        collation: 'utf8mb4_unicode_ci',
        nullable: true
    })
    public location_begin!: string | null;

    @Column({
        type: 'text',
        charset: 'utf8mb4',
        collation: 'utf8mb4_unicode_ci',
        nullable: true
    })
    public location_end!: string | null;

    @Column({default: 0})
    public photo_taken!: number;

    @Column({default: ''})
    public distance_coast!: string;

    @Column({default: 0})
    public distance_coast_estimation_gps!: number;

    @Index()
    @Column({default: 0})
    public species_id!: number;

    @Index()
    @Column({default: 0})
    public species_count!: number;

    @Column({default: 0})
    public juveniles!: number;

    @Column({default: 0})
    public calves!: number;

    @Column({default: 0})
    public newborns!: number;

    @Column({
        charset: 'utf8mb4',
        collation: 'utf8mb4_unicode_ci',
        default: ''
    })
    public behaviours!: string;

    @Column({default: 0})
    public subgroups!: number;

    @Column({default: 0})
    public group_structure_id!: number;

    @Column({default: 0})
    public reaction_id!: number;

    @Column({
        type: 'text',
        charset: 'utf8mb4',
        collation: 'utf8mb4_unicode_ci',
        default: ''
    })
    public freq_behaviour!: string;

    @Column({
        type: 'text',
        charset: 'utf8mb4',
        collation: 'utf8mb4_unicode_ci',
        default: ''
    })
    public recognizable_animals!: string;

    @Column({
        type: 'text',
        charset: 'utf8mb4',
        collation: 'utf8mb4_unicode_ci',
        default: ''
    })
    public other_species!: string;

    @Column({
        type: 'text',
        charset: 'utf8mb4',
        collation: 'utf8mb4_unicode_ci',
        default: ''
    })
    public other!: string;

    @Column({
        type: 'text',
        charset: 'utf8mb4',
        collation: 'utf8mb4_unicode_ci',
        default: ''
    })
    public other_vehicle!: string;

    @Column({
        type: 'text',
        charset: 'utf8mb4',
        collation: 'utf8mb4_unicode_ci',
        default: ''
    })
    public note!: string;

    @Index()
    @Column({default: 0})
    public organization_id!: number;

    @Index()
    @Column({default: 0})
    public sighting_type!: number;

    @Index()
    @Column({default: false})
    public deleted!: boolean;

    // ---------------------------------------------------------------
    // Old-data-specific columns (no app-model equivalent).
    // ---------------------------------------------------------------

    /**
     * Boat name as written in the old table (no vehicle_id back then).
     */
    @Column({
        type: 'varchar',
        length: 128,
        charset: 'utf8mb4',
        collation: 'utf8mb4_unicode_ci',
        default: ''
    })
    public boat_name!: string;

    /**
     * Skipper name as written in the old table (no driver_id back then).
     */
    @Column({
        type: 'varchar',
        length: 128,
        charset: 'utf8mb4',
        collation: 'utf8mb4_unicode_ci',
        default: ''
    })
    public skipper_name!: string;

    /**
     * Raw species string from the old table — kept always, and the only
     * species info when it couldn't be resolved to a species_id.
     */
    @Column({
        type: 'varchar',
        length: 128,
        charset: 'utf8mb4',
        collation: 'utf8mb4_unicode_ci',
        default: ''
    })
    public species_name_raw!: string;

    /**
     * Hand-recorded depth (m) from the old table. NULL when absent.
     */
    @Column({
        type: 'decimal',
        precision: 7,
        scale: 1,
        nullable: true
    })
    public depth_m!: number | null;

    /**
     * Source workbook file name (import provenance).
     */
    @Index()
    @Column({
        type: 'varchar',
        length: 256,
        default: ''
    })
    public source_file!: string;

    /**
     * Original row number / SIGHTING id in the source sheet. Together with
     * `source_file` the idempotency key — re-imports skip existing rows.
     */
    @Index()
    @Column({default: 0})
    public source_row!: number;

}