import {Enricher, EnricherResult} from '../Types.js';

/**
 * Human-pressure enricher (Tier 3) — non-fishing vessel-traffic density plus
 * distance to the nearest shipping lane, port and MPA boundary. Complements
 * the fishing-effort table (which already covers AIS fishing activity).
 *
 * SCAFFOLD, gated OFF by default.
 *   - Vessel density: EMODnet Human Activities publishes it as a WMS; a
 *     per-point value is a GetFeatureInfo request against that service. The
 *     exact layer id / CRS / INFO_FORMAT cannot be verified here, so it is
 *     left for a wiring pass behind `MWPA_ENRICH_VESSEL_WMS` (the WMS base).
 *   - Distances to lanes / ports / MPAs need reference GEODATA (shipping-lane
 *     lines, a port point set, WDPA/Natura2000 polygons) which are NOT in the
 *     repo. They are computed locally once those files are dropped into the
 *     data dir named by `MWPA_ENRICH_GEODATA_DIR`.
 *
 * Until configured this reports `no_provider` and fabricates nothing. The
 * columns (`vessel_density_day`, `dist_shipping_lane_km`, `dist_port_km`,
 * `dist_mpa_km`) already exist, so enabling each source is additive.
 */
export class HumanPressureEnricher implements Enricher {

    /**
     * Stable enricher id.
     */
    public static readonly NAME = 'human_pressure';

    /**
     * EMODnet vessel-density WMS base URL. Absent → vessel density disabled.
     * @private
     */
    private static readonly WMS_ENV = 'MWPA_ENRICH_VESSEL_WMS';

    /**
     * Directory holding the reference geodata for the distance metrics.
     * Absent → distance metrics disabled.
     * @private
     */
    private static readonly GEODATA_ENV = 'MWPA_ENRICH_GEODATA_DIR';

    public getName(): string {
        return HumanPressureEnricher.NAME;
    }

    public async enrich(): Promise<EnricherResult> {
        const hasWms = (process.env[HumanPressureEnricher.WMS_ENV] ?? '').trim() !== '';
        const hasGeodata = (process.env[HumanPressureEnricher.GEODATA_ENV] ?? '').trim() !== '';

        if (!hasWms && !hasGeodata) {
            return {fields: {human_status: 'no_provider'}, provenance: {}};
        }

        // At least one source configured but its lookup is not wired yet.
        return {fields: {human_status: 'no_data'}, provenance: {}};
    }

}