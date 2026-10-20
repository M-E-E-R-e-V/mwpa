import {DBBaseEntityUnid} from '@stefanwerfling/figtree';
import {Column, Entity, Index} from 'typeorm';

/**
 * Per-sighting environmental enrichment produced by the EnrichmentService.
 *
 * This is a NEW derived table deliberately kept separate from the original
 * `sighting` table — the raw sighting record is never modified. Unlike the
 * older derived tables (sighting_extended, sighting_fishing_effort) which
 * reference the sighting by its numeric `id`, this table references the
 * sighting by its stable **`unid`** string (`sighting_unid`), so the link
 * survives id re-numbering / re-import and matches the mobile wire key.
 *
 * The columns cover the "Tier 1-3" enrichment set:
 *   - astro_*        — astronomy, pure computation (moon/sun/day length)
 *   - meteo_*        — extra Open-Meteo weather (pressure/cloud/visibility/precip)
 *   - up_index_*     — Ekman upwelling index (derived from wind + coast normal)
 *   - front_* / seabed_* / shelf_* — spatial derivatives (SST/chl fronts, slope)
 *   - bgc_*          — CMEMS biogeochemistry (O2, pH, NO3, MLD, NPP) — gated
 *   - tide_*         — tidal height/phase — gated
 *   - vessel_* / dist_* — human-pressure layer — gated on external geodata
 *
 * One row per `sighting_unid` (enforced by the service's upsert). Per-domain
 * `*_status` columns record the outcome of each enricher ('', 'ok', 'no_data',
 * 'no_provider', …) while the single `enrichment_last_update` drives the cron
 * stale-poll. NULL metric = "not computed yet" or "no data", disambiguated by
 * the matching status column.
 */
@Entity({name: 'sighting_enrichment'})
export class SightingEnrichment extends DBBaseEntityUnid {

    /**
     * Owning sighting, referenced by its stable `unid` (NOT the numeric id).
     * Logically 1:1 — the upsert flow keeps that invariant.
     */
    @Index()
    @Column({
        type: 'varchar',
        length: 64
    })
    public sighting_unid!: string;

    // ---------------------------------------------------------------
    // Astronomy (Tier 1) — pure computation, no external source.
    // ---------------------------------------------------------------

    /**
     * Moon phase as a fraction of the synodic cycle at the sighting
     * datetime: 0 = new moon, 0.5 = full moon, →1 wraps back to new.
     */
    @Column({
        type: 'decimal',
        precision: 4,
        scale: 3,
        nullable: true
    })
    public moon_phase!: number | null;

    /**
     * Illuminated fraction of the lunar disk (%), 0..100.
     */
    @Column({
        type: 'decimal',
        precision: 5,
        scale: 1,
        nullable: true
    })
    public moon_illumination_pct!: number | null;

    /**
     * Solar elevation angle (degrees above the horizon) at the sighting
     * datetime. Negative = sun below horizon. Detectability / glare proxy.
     */
    @Column({
        type: 'decimal',
        precision: 4,
        scale: 1,
        nullable: true
    })
    public sun_elevation_deg!: number | null;

    /**
     * Solar azimuth (degrees clockwise from true north) at the sighting
     * datetime. Combined with the bearing to the animal it flags glare.
     */
    @Column({
        type: 'smallint',
        nullable: true
    })
    public sun_azimuth_deg!: number | null;

    /**
     * Day length (hours of sunlight) at the sighting location and date.
     */
    @Column({
        type: 'decimal',
        precision: 4,
        scale: 2,
        nullable: true
    })
    public day_length_h!: number | null;

    /**
     * Astronomy enricher status: '', 'ok', 'invalid_date', 'invalid_location'.
     */
    @Column({
        type: 'varchar',
        length: 32,
        default: ''
    })
    public astro_status!: string;

    // ---------------------------------------------------------------
    // Extra weather (Tier 1) — Open-Meteo, same upstream as WeatherService.
    // ---------------------------------------------------------------

    /**
     * Mean sea-level pressure, day mean (hPa).
     */
    @Column({
        type: 'decimal',
        precision: 6,
        scale: 1,
        nullable: true
    })
    public pressure_msl_hpa_day!: number | null;

    /**
     * Total cloud cover, day mean (%), 0..100.
     */
    @Column({
        type: 'smallint',
        nullable: true
    })
    public cloud_cover_pct_day!: number | null;

    /**
     * Horizontal visibility, day mean (metres).
     */
    @Column({
        type: 'int',
        nullable: true
    })
    public visibility_m_day!: number | null;

    /**
     * Precipitation total over the sighting day (mm).
     */
    @Column({
        type: 'decimal',
        precision: 6,
        scale: 2,
        nullable: true
    })
    public precipitation_mm_day!: number | null;

    /**
     * Extra-weather enricher status.
     */
    @Column({
        type: 'varchar',
        length: 32,
        default: ''
    })
    public meteo_status!: string;

    // ---------------------------------------------------------------
    // Upwelling (Tier 1) — Ekman index derived from wind + coast normal.
    // ---------------------------------------------------------------

    /**
     * Bakun-style coastal upwelling index: offshore Ekman transport per
     * metre of coast (m³/s per 100 m), positive = upwelling-favourable
     * (offshore transport), negative = downwelling. NULL when no coast
     * normal could be resolved or wind is missing.
     */
    @Column({
        type: 'decimal',
        precision: 8,
        scale: 3,
        nullable: true
    })
    public upwelling_index_day!: number | null;

    /**
     * Upwelling enricher status.
     */
    @Column({
        type: 'varchar',
        length: 32,
        default: ''
    })
    public upwelling_status!: string;

    // ---------------------------------------------------------------
    // Spatial derivatives (Tier 1) — stencil fetches (ERDDAP / bathymetry).
    // ---------------------------------------------------------------

    /**
     * Sea-surface-temperature horizontal gradient magnitude (°C per km)
     * at the sighting — thermal-front strength. Higher = sharper front.
     */
    @Column({
        type: 'decimal',
        precision: 7,
        scale: 4,
        nullable: true
    })
    public sst_front_grad_c_km_day!: number | null;

    /**
     * Surface-chlorophyll horizontal gradient magnitude (mg/m³ per km)
     * at the sighting — productivity-front strength.
     */
    @Column({
        type: 'decimal',
        precision: 8,
        scale: 4,
        nullable: true
    })
    public chl_front_grad_mg_m3_km_day!: number | null;

    /**
     * Seabed slope (degrees) at the sighting, from a bathymetry stencil.
     */
    @Column({
        type: 'decimal',
        precision: 5,
        scale: 2,
        nullable: true
    })
    public seabed_slope_deg!: number | null;

    /**
     * Great-circle distance (km) to the nearest shelf break (the 200 m
     * isobath). NULL when the stencil search found no crossing nearby.
     */
    @Column({
        type: 'decimal',
        precision: 7,
        scale: 2,
        nullable: true
    })
    public shelf_distance_km!: number | null;

    /**
     * Spatial-derivative enricher status.
     */
    @Column({
        type: 'varchar',
        length: 32,
        default: ''
    })
    public derived_status!: string;

    // ---------------------------------------------------------------
    // Biogeochemistry (Tier 2) — CMEMS, gated.
    // ---------------------------------------------------------------

    /**
     * Dissolved oxygen, surface (mmol/m³), day value.
     */
    @Column({
        type: 'decimal',
        precision: 7,
        scale: 2,
        nullable: true
    })
    public oxygen_mmol_m3_day!: number | null;

    /**
     * Sea-water pH, surface, day value.
     */
    @Column({
        type: 'decimal',
        precision: 4,
        scale: 2,
        nullable: true
    })
    public ph_day!: number | null;

    /**
     * Nitrate concentration, surface (mmol/m³), day value.
     */
    @Column({
        type: 'decimal',
        precision: 7,
        scale: 2,
        nullable: true
    })
    public nitrate_mmol_m3_day!: number | null;

    /**
     * Mixed-layer depth (m), day value.
     */
    @Column({
        type: 'decimal',
        precision: 7,
        scale: 1,
        nullable: true
    })
    public mld_m_day!: number | null;

    /**
     * Net primary production (mg C / m² / day), day value.
     */
    @Column({
        type: 'decimal',
        precision: 9,
        scale: 2,
        nullable: true
    })
    public npp_mg_c_m2_day!: number | null;

    /**
     * Biogeochemistry enricher status ('', 'ok', 'no_data', 'no_provider').
     */
    @Column({
        type: 'varchar',
        length: 32,
        default: ''
    })
    public bgc_status!: string;

    // ---------------------------------------------------------------
    // Tide (Tier 2) — gated on a tidal model / API.
    // ---------------------------------------------------------------

    /**
     * Tidal height relative to mean sea level (m) at the sighting datetime.
     */
    @Column({
        type: 'decimal',
        precision: 5,
        scale: 2,
        nullable: true
    })
    public tide_height_m!: number | null;

    /**
     * Tidal phase at the sighting datetime: 'flood' | 'ebb' | 'high' | 'low'.
     */
    @Column({
        type: 'varchar',
        length: 8,
        nullable: true
    })
    public tide_phase!: string | null;

    /**
     * Tide enricher status ('', 'ok', 'no_data', 'no_provider').
     */
    @Column({
        type: 'varchar',
        length: 32,
        default: ''
    })
    public tide_status!: string;

    // ---------------------------------------------------------------
    // Human pressure (Tier 3) — gated on external vessel-density / geodata.
    // ---------------------------------------------------------------

    /**
     * Non-fishing vessel-traffic density at the sighting (hours per km²
     * per month, EMODnet Human Activities). Collision / noise proxy,
     * complementing the fishing-effort table.
     */
    @Column({
        type: 'decimal',
        precision: 9,
        scale: 2,
        nullable: true
    })
    public vessel_density_day!: number | null;

    /**
     * Great-circle distance (km) to the nearest major shipping lane.
     */
    @Column({
        type: 'decimal',
        precision: 7,
        scale: 2,
        nullable: true
    })
    public dist_shipping_lane_km!: number | null;

    /**
     * Great-circle distance (km) to the nearest port.
     */
    @Column({
        type: 'decimal',
        precision: 7,
        scale: 2,
        nullable: true
    })
    public dist_port_km!: number | null;

    /**
     * Signed distance (km) to the nearest marine-protected-area boundary:
     * negative = inside an MPA, positive = outside.
     */
    @Column({
        type: 'decimal',
        precision: 7,
        scale: 2,
        nullable: true
    })
    public dist_mpa_km!: number | null;

    /**
     * Human-pressure enricher status ('', 'ok', 'no_data', 'no_provider').
     */
    @Column({
        type: 'varchar',
        length: 32,
        default: ''
    })
    public human_status!: string;

    // ---------------------------------------------------------------
    // Bookkeeping.
    // ---------------------------------------------------------------

    /**
     * Overall enrichment status for the row: 'ok' once at least one
     * enricher ran, or a hard-skip marker ('invalid_location',
     * 'invalid_date', 'land'). Drives nothing on its own — the poll uses
     * `enrichment_last_update` — but is handy for diagnostics.
     */
    @Column({
        type: 'varchar',
        length: 32,
        default: ''
    })
    public enrichment_status!: string;

    /**
     * When the enrichment row was last (re)computed. NULL = never. This
     * is the single field the cron stale-poll filters on.
     */
    @Column({
        type: 'datetime',
        nullable: true
    })
    public enrichment_last_update!: Date | null;

    /**
     * Per-column data provenance: value column → producing enricher/source
     * id (e.g. {'sst_front_grad_c_km_day': 'erddap', 'moon_phase': 'astro'}).
     * NULL when nothing has been written yet.
     */
    @Column({
        type: 'simple-json',
        nullable: true
    })
    public provenance!: Record<string, string> | null;

}