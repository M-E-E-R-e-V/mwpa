import {CmemsBgcProvider} from '../../Ocean/Providers/CmemsBgcProvider.js';
import {Enricher, EnricherResult, EnrichmentContext} from '../Types.js';

/**
 * Biogeochemistry enricher (Tier 2) — surface dissolved oxygen, pH, nitrate
 * and mixed-layer depth from CMEMS (via {@link CmemsBgcProvider}, the public
 * Copernicus Marine WMTS GetFeatureInfo scalar read).
 *
 * Gated OFF by default: it only attempts the lookup when
 * `MWPA_ENRICH_CMEMS_BGC=1` is set, otherwise it reports `no_provider` and
 * writes no value columns (so a default deployment pays no extra upstream
 * calls). When enabled it is the costliest enricher after the derived one —
 * up to four CMEMS reads (each with an NRT→reprocessed fallback) per sighting,
 * rate-limited to ~1 req/s by the shared WMTS client.
 *
 * Net primary production (`npp_mg_c_m2_day`) stays null: the CMEMS `nppv`
 * variable is volumetric and can't fill the depth-integrated areal column
 * without mislabelling the units (see {@link CmemsBgcProvider}).
 */
export class BgcEnricher implements Enricher {

    /**
     * Stable enricher id.
     */
    public static readonly NAME = 'cmems_bgc';

    /**
     * Env flag that must be '1' to attempt the CMEMS lookup.
     * @private
     */
    private static readonly ENABLE_ENV = 'MWPA_ENRICH_CMEMS_BGC';

    private readonly _provider: CmemsBgcProvider;

    public constructor(provider?: CmemsBgcProvider) {
        this._provider = provider ?? new CmemsBgcProvider();
    }

    public getName(): string {
        return BgcEnricher.NAME;
    }

    public async enrich(ctx: EnrichmentContext): Promise<EnricherResult> {
        // Gated off until explicitly enabled (the CMEMS reads are not free).
        if (process.env[BgcEnricher.ENABLE_ENV] !== '1') {
            return {fields: {bgc_status: 'no_provider'}, provenance: {}};
        }

        const sample = await this._provider.getBgc(ctx.latitude, ctx.longitude, ctx.isoDate);

        if (sample === null) {
            return {fields: {bgc_status: 'no_data'}, provenance: {}};
        }

        const fields: EnricherResult['fields'] = {bgc_status: 'ok'};
        const provenance: Record<string, string> = {};

        if (sample.oxygen_mmol_m3 !== undefined) {
            fields.oxygen_mmol_m3_day = sample.oxygen_mmol_m3;
            provenance.oxygen_mmol_m3_day = CmemsBgcProvider.NAME;
        }
        if (sample.ph !== undefined) {
            fields.ph_day = sample.ph;
            provenance.ph_day = CmemsBgcProvider.NAME;
        }
        if (sample.nitrate_mmol_m3 !== undefined) {
            fields.nitrate_mmol_m3_day = sample.nitrate_mmol_m3;
            provenance.nitrate_mmol_m3_day = CmemsBgcProvider.NAME;
        }
        if (sample.mld_m !== undefined) {
            fields.mld_m_day = sample.mld_m;
            provenance.mld_m_day = CmemsBgcProvider.NAME;
        }

        return {fields: fields, provenance: provenance};
    }

}