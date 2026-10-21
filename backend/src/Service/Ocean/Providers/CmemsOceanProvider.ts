import {CmemsWmtsClient} from '../../Currents/CmemsWmtsClient.js';
import {OceanInfo, OceanProvider, OceanSample} from '../Types.js';

/**
 * CMEMS ocean provider — surface chlorophyll-a + salinity from the public
 * Copernicus Marine WMTS (`wmts.marine.copernicus.eu`, no auth), via the
 * shared {@link CmemsWmtsClient} GetFeatureInfo scalar read.
 *
 * Added as the PRIMARY source for chl + SSS because NOAA CoastWatch Central
 * ERDDAP (the ErddapProvider's chl/sss host) has been unreliable; the
 * OceanProviderRegistry MERGES fields, so ERDDAP still contributes the
 * altimetric currents/SLA it serves from the (healthy) pfeg node.
 *
 * For each variable two layers are tried in order — the near-real-time
 * product first (rolling ~2-week window), then the reprocessed multi-year
 * product (back to the 1990s, lagging a few weeks). The first non-null wins,
 * so the NRT→reprocessed boundary is handled automatically without a date
 * calculation: an out-of-range NRT request just returns null and falls
 * through to the reprocessed layer. All layers are global.
 */
export class CmemsOceanProvider implements OceanProvider {

    /**
     * Stable provider id (stored in OceanInfo.provider / provenance).
     */
    public static readonly NAME = 'cmems';

    /**
     * Surface chlorophyll-a (mg/m³) layers, NRT first then reprocessed.
     * @private
     */
    private static readonly CHL_LAYERS = [
        'OCEANCOLOUR_GLO_BGC_L4_NRT_009_102/cmems_obs-oc_glo_bgc-plankton_nrt_l4-gapfree-multi-4km_P1D_202311/CHL',
        'OCEANCOLOUR_GLO_BGC_L4_MY_009_104/cmems_obs-oc_glo_bgc-plankton_my_l4-gapfree-multi-4km_P1D_202603/CHL'
    ];

    /**
     * Surface salinity (PSU, model `so`) layers, analysis-forecast first
     * then multi-year reanalysis.
     * @private
     */
    private static readonly SSS_LAYERS = [
        'GLOBAL_ANALYSISFORECAST_PHY_001_024/cmems_mod_glo_phy-so_anfc_0.083deg_P1D-m_202406/so',
        'GLOBAL_MULTIYEAR_PHY_001_030/cmems_mod_glo_phy_my_0.083deg_P1D-m_202311/so'
    ];

    /**
     * Earliest date any wired layer covers (ocean-colour / SeaWiFS era).
     * @private
     */
    private static readonly EARLIEST_ISO_DATE = '1997-09-01';

    private readonly _client: CmemsWmtsClient;

    public constructor(client?: CmemsWmtsClient) {
        this._client = client ?? new CmemsWmtsClient();
    }

    public getName(): string {
        return CmemsOceanProvider.NAME;
    }

    public supports(): boolean {
        return true;
    }

    public async getOcean(
        latitude: number,
        longitude: number,
        isoDate: string
    ): Promise<OceanInfo | null> {
        if (isoDate < CmemsOceanProvider.EARLIEST_ISO_DATE) {
            return null;
        }

        const day: OceanSample = {};

        const chl = await this._firstScalar(CmemsOceanProvider.CHL_LAYERS, latitude, longitude, isoDate);

        if (chl !== null && chl >= 0) {
            day.chl_a_mg_m3 = CmemsOceanProvider._round(chl, 3);
        }

        const salinity = await this._firstScalar(CmemsOceanProvider.SSS_LAYERS, latitude, longitude, isoDate);

        if (salinity !== null && salinity > 0) {
            day.salinity_psu = CmemsOceanProvider._round(salinity, 2);
        }

        if (day.chl_a_mg_m3 === undefined && day.salinity_psu === undefined) {
            return null;
        }

        return {
            day: day,
            provider: CmemsOceanProvider.NAME,
            fetched_at: Date.now()
        };
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