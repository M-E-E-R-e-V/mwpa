import {DBBaseEntityUnid} from 'figtree';
import {Column, Entity, Index} from 'typeorm';

/**
 * Serialised payload for {@link SightingCurrentField.field_json}: a
 * regular rectangular grid of surface-current u/v vectors around the
 * sighting position. `grid_lat[i]` and `grid_lon[j]` give the
 * coordinates of cell `(i, j)`; `u[i][j]` and `v[i][j]` are the
 * eastward and northward components in m/s. NaN/null entries mean the
 * upstream had no value (land, missing tile, etc.) at that cell.
 */
export type SightingCurrentFieldGrid = {
    grid_lat: number[];
    grid_lon: number[];
    u: (number | null)[][];
    v: (number | null)[][];
};

/**
 * Per-sighting regional surface-current patch from a high-resolution
 * model (CMEMS Mercator 1/12° via WMTS GetFeatureInfo). One row per
 * sighting, written lazily (on demand or by a slow background task)
 * because each row needs ~80–170 upstream GETs to fill the grid.
 *
 * Separate table from {@link SightingExtended} because:
 *   - The payload is bulky JSON (~5–15 KB per row) and would inflate
 *     the row width of the hot-path metadata table.
 *   - Backfill is opt-in / lazy: many sightings will never have a
 *     regional patch, and we want NULL-rows to be cheap.
 *   - The aggregates derived from the patch (mean/max speed, curl,
 *     divergence) live on {@link SightingExtended} so SQL filters and
 *     the existing environment endpoint can use them directly.
 */
@Entity({name: 'sighting_current_field'})
export class SightingCurrentField extends DBBaseEntityUnid {

    /**
     * Owning sighting (logically 1:1 — the upsert in the repository
     * keeps that invariant).
     */
    @Index()
    @Column()
    public sighting_id!: number;

    /**
     * Bounding box of the patch — westernmost longitude (degrees).
     */
    @Column({
        type: 'decimal',
        precision: 8,
        scale: 4
    })
    public bbox_west!: number;

    /**
     * Easternmost longitude (degrees).
     */
    @Column({
        type: 'decimal',
        precision: 8,
        scale: 4
    })
    public bbox_east!: number;

    /**
     * Southernmost latitude (degrees).
     */
    @Column({
        type: 'decimal',
        precision: 8,
        scale: 4
    })
    public bbox_south!: number;

    /**
     * Northernmost latitude (degrees).
     */
    @Column({
        type: 'decimal',
        precision: 8,
        scale: 4
    })
    public bbox_north!: number;

    /**
     * Grid step in degrees (uniform for lat and lon). Typically a
     * model-native fraction like 0.0833 (1/12°) for CMEMS or coarsened
     * (e.g. 0.125°) to keep the per-sighting upstream cost manageable.
     */
    @Column({
        type: 'decimal',
        precision: 6,
        scale: 4
    })
    public grid_step_deg!: number;

    /**
     * Number of grid rows (latitude axis). Cached here so consumers
     * don't have to JSON-parse the payload just to size the canvas.
     */
    @Column({
        type: 'smallint'
    })
    public grid_n_lat!: number;

    /**
     * Number of grid columns (longitude axis).
     */
    @Column({
        type: 'smallint'
    })
    public grid_n_lon!: number;

    /**
     * The grid itself — see {@link SightingCurrentFieldGrid}. Stored as
     * `simple-json` rather than native MariaDB JSON so dev/test rigs on
     * older engine versions stay compatible; the per-row payload is
     * small enough (≤ ~15 KB at 25×25) that the lack of indexed
     * predicates inside the JSON is fine.
     */
    @Column({
        type: 'simple-json'
    })
    public field_json!: SightingCurrentFieldGrid;

    /**
     * Provider id that produced the patch (e.g. `cmems_wmts_glo_anfc`
     * for the Global Analysis-Forecast WMTS, or `cmems_wmts_glo_my`
     * for the historical multi-year product).
     */
    @Column({
        type: 'varchar',
        length: 64
    })
    public source!: string;

    /**
     * Upstream time stamp the values represent (`time` dimension of the
     * WMTS layer, usually 00:00 UTC of the sighting day).
     */
    @Column({
        type: 'datetime'
    })
    public valid_at!: Date;

    /**
     * When the patch was pulled from the upstream. Drives the
     * refresh / staleness check.
     */
    @Column({
        type: 'datetime'
    })
    public fetched_at!: Date;

}