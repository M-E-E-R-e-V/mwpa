import {CmemsWmtsClient} from '../../Currents/CmemsWmtsClient.js';

/**
 * Surface biogeochemistry sample from CMEMS. All fields optional — a cloud/
 * coverage gap or an out-of-range date drops the individual variable, not the
 * whole sample.
 */
export type BgcSample = {

    /**
     * Dissolved oxygen (mmol/m³), surface.
     */
    oxygen_mmol_m3?: number;

    /**
     * Sea-water pH, surface.
     */
    ph?: number;

    /**
     * Nitrate concentration (mmol/m³), surface.
     */
    nitrate_mmol_m3?: number;

    /**
     * Mixed-layer depth (m).
     */
    mld_m?: number;

};

/**
 * CMEMS biogeochemistry provider — surface dissolved oxygen, pH, nitrate and
 * mixed-layer depth from the public Copernicus Marine WMTS
 * (`wmts.marine.copernicus.eu`, no auth) via the shared {@link CmemsWmtsClient}
 * GetFeatureInfo scalar read — the same transport the currents + chl/salinity
 * providers use.
 *
 * O2/pH/NO3 come from the global BGC model (analysis-forecast NRT first, then
 * the multi-year reprocessed product for older dates — the first non-null
 * wins, so the boundary needs no date math). MLD (`mlotst`) is a physical
 * variable and comes from the PHY model instead. pH has no daily reprocessed
 * layer, so it only resolves for the NRT window; older dates leave it unset.
 *
 * Layer ids were taken verbatim from the WMTS GetCapabilities
 * (`{PRODUCT}/{datasetId}/{variable}`); the upstream catalog is authoritative
 * and the dataset-version suffix (`_YYYYMM`) changes on reprocessing.
 *
 * Net primary production is deliberately NOT read here: the CMEMS `nppv`
 * variable is volumetric (mg C/m³/day) while the `npp_mg_c_m2_day` column is a
 * depth-integrated areal rate — a surface point read can't fill it without
 * mislabelling the units, so that column stays null.
 */
export class CmemsBgcProvider {

    /**
     * Stable provider id (stored in provenance).
     */
    public static readonly NAME = 'cmems';

    /**
     * Dissolved-oxygen (mmol/m³) layers, NRT first then reprocessed.
     * @private
     */
    private static readonly O2_LAYERS = [
        'GLOBAL_ANALYSISFORECAST_BGC_001_028/cmems_mod_glo_bgc-bio_anfc_0.25deg_P1D-m_202311/o2',
        'GLOBAL_MULTIYEAR_BGC_001_029/cmems_mod_glo_bgc_my_0.25deg_P1D-m_202406/o2'
    ];

    /**
     * Sea-water pH layers. NRT only — the reprocessed product serves pH at
     * monthly cadence only, which we don't mix into a daily value.
     * @private
     */
    private static readonly PH_LAYERS = [
        'GLOBAL_ANALYSISFORECAST_BGC_001_028/cmems_mod_glo_bgc-car_anfc_0.25deg_P1D-m_202311/ph'
    ];

    /**
     * Nitrate (mmol/m³) layers, NRT first then reprocessed.
     * @private
     */
    private static readonly NO3_LAYERS = [
        'GLOBAL_ANALYSISFORECAST_BGC_001_028/cmems_mod_glo_bgc-nut_anfc_0.25deg_P1D-m_202311/no3',
        'GLOBAL_MULTIYEAR_BGC_001_029/cmems_mod_glo_bgc_my_0.25deg_P1D-m_202406/no3'
    ];

    /**
     * Mixed-layer-depth (`mlotst`, m) layers from the PHY model, NRT first
     * then reprocessed.
     * @private
     */
    private static readonly MLD_LAYERS = [
        'GLOBAL_ANALYSISFORECAST_PHY_001_024/cmems_mod_glo_phy_anfc_0.083deg_P1D-m_202406/mlotst',
        'GLOBAL_MULTIYEAR_PHY_001_030/cmems_mod_glo_phy_my_0.083deg_P1D-m_202311/mlotst'
    ];

    /**
     * Earliest date any wired layer covers (BGC reanalysis era). Before this
     * every read would be out of range — short-circuit to save calls.
     * @private
     */
    private static readonly EARLIEST_ISO_DATE = '1993-01-01';

    private readonly _client: CmemsWmtsClient;

    public constructor(client?: CmemsWmtsClient) {
        this._client = client ?? new CmemsWmtsClient();
    }

    public getName(): string {
        return CmemsBgcProvider.NAME;
    }

    /**
     * Surface BGC sample at a point, or null when nothing resolved (before the
     * reanalysis era, or every variable a coverage gap).
     */
    public async getBgc(
        latitude: number,
        longitude: number,
        isoDate: string
    ): Promise<BgcSample | null> {
        if (isoDate < CmemsBgcProvider.EARLIEST_ISO_DATE) {
            return null;
        }

        const [o2, ph, no3, mld] = await Promise.all([
            this._firstScalar(CmemsBgcProvider.O2_LAYERS, latitude, longitude, isoDate),
            this._firstScalar(CmemsBgcProvider.PH_LAYERS, latitude, longitude, isoDate),
            this._firstScalar(CmemsBgcProvider.NO3_LAYERS, latitude, longitude, isoDate),
            this._firstScalar(CmemsBgcProvider.MLD_LAYERS, latitude, longitude, isoDate)
        ]);

        const sample: BgcSample = {};

        if (o2 !== null && o2 >= 0) {
            sample.oxygen_mmol_m3 = CmemsBgcProvider._round(o2, 2);
        }
        if (ph !== null && ph > 0) {
            sample.ph = CmemsBgcProvider._round(ph, 2);
        }
        if (no3 !== null && no3 >= 0) {
            sample.nitrate_mmol_m3 = CmemsBgcProvider._round(no3, 2);
        }
        if (mld !== null && mld > 0) {
            sample.mld_m = CmemsBgcProvider._round(mld, 1);
        }

        if (Object.keys(sample).length === 0) {
            return null;
        }

        return sample;
    }

    /**
     * Try each layer in order, returning the first non-null scalar value.
     * @private
     */
    private async _firstScalar(
        layers: string[],
        latitude: number,
        longitude: number,
        isoDate: string
    ): Promise<number | null> {
        for (const layer of layers) {
            // eslint-disable-next-line no-await-in-loop
            const value = await this._client.getScalar(layer, latitude, longitude, isoDate);

            if (value !== null) {
                return value;
            }
        }

        return null;
    }

    /**
     * Round to `digits` decimals.
     * @private
     */
    private static _round(value: number, digits: number): number {
        const factor = 10 ** digits;

        return Math.round(value * factor) / factor;
    }

}