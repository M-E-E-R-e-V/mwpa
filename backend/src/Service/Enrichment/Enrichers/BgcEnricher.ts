import {Enricher, EnricherResult} from '../Types.js';

/**
 * Biogeochemistry enricher (Tier 2) — dissolved oxygen, pH, nitrate,
 * mixed-layer depth and net primary production from CMEMS.
 *
 * SCAFFOLD, gated OFF by default. CMEMS BGC products are not served as
 * plain point JSON: the reachable WMTS tiles (the same transport the
 * currents pipeline uses, {@link CmemsWmtsClient}) return rendered imagery
 * that has to be decoded per variable, and the OPeNDAP/subset path needs a
 * Copernicus Marine account. Because that integration cannot be exercised
 * here against the live service, this enricher does not fabricate values —
 * it reports `no_provider` until `MWPA_ENRICH_CMEMS_BGC=1` is set AND the
 * per-variable WMTS decode (or a subset endpoint) is wired into the
 * enabled branch. The columns (`oxygen_mmol_m3_day`, `ph_day`,
 * `nitrate_mmol_m3_day`, `mld_m_day`, `npp_mg_c_m2_day`) already exist, so
 * switching this on is additive — no schema change.
 */
export class BgcEnricher implements Enricher {

    /**
     * Stable enricher id.
     */
    public static readonly NAME = 'cmems_bgc';

    /**
     * Env flag that must be '1' to attempt the (to-be-wired) CMEMS lookup.
     * @private
     */
    private static readonly ENABLE_ENV = 'MWPA_ENRICH_CMEMS_BGC';

    public getName(): string {
        return BgcEnricher.NAME;
    }

    public async enrich(): Promise<EnricherResult> {
        // Gated off until a CMEMS BGC source is wired and verifiable.
        if (process.env[BgcEnricher.ENABLE_ENV] !== '1') {
            return {fields: {bgc_status: 'no_provider'}, provenance: {}};
        }

        // Enabled but the live fetch is not wired yet — record no_data rather
        // than inventing values. The WMTS-decode / subset call goes here.
        return {fields: {bgc_status: 'no_data'}, provenance: {}};
    }

}