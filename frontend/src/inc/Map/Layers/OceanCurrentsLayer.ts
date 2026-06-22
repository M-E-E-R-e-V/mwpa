import {get as getProjection} from 'ol/proj';
import {getTopLeft, getWidth} from 'ol/extent';
import BaseLayer from 'ol/layer/Base';
import TileLayer from 'ol/layer/Tile';
import {WMTS} from 'ol/source';
import WMTSTileGrid from 'ol/tilegrid/WMTS';
import {MapLayer} from '../MapLayer';

/**
 * CMEMS surface-currents overlay.
 *
 * Pulls the daily-mean `sea_water_velocity` tiles from the public
 * Copernicus Marine WMTS at `wmts.marine.copernicus.eu/teroWmts`. The
 * upstream layer is the Global Analysis-Forecast Physics 1/12° product
 * (`GLOBAL_ANALYSISFORECAST_PHY_001_024`), rendered server-side as
 * coloured magnitude + vector overlay (`vectorStyle:solidAndVector,
 * cmap:thermal`). Time defaults to today at 00:00 UTC — adjust
 * {@link OceanCurrentsLayer.OVERRIDE_TIME} when porting to historical
 * snapshots or hard-pinning a layer for screenshots.
 *
 * No backend involvement: the WMTS host is public (no API key, no auth
 * — verified by curl 2026-06). Tiles are time-aware so we deliberately
 * skip the `/mapcache` slippy-proxy and let OpenLayers / the browser
 * HTTP cache handle short-term reuse.
 *
 * Replaces the NASA GIBS OSCAR overlay this class used to load. OSCAR
 * was 1/3° (~33 km), lagged ~12 months in GIBS, and exposed U/V only as
 * two separate scalar layers — practically unusable at island scale.
 *
 * Hidden by default so it doesn't fight the productivity / SST
 * overlays on first map open.
 */
export class OceanCurrentsLayer extends MapLayer {

    /**
     * WMTS endpoint base. Public — no auth required.
     */
    private static readonly WMTS_BASE = 'https://wmts.marine.copernicus.eu/teroWmts';

    /**
     * WMTS layer identifier (`{PRODUCT}/{datasetId}/{variable}`).
     * Bump `datasetId` if the upstream version stamp (`_202406`) is
     * retired — `GetCapabilities` is the source of truth.
     */
    private static readonly WMTS_LAYER =
        'GLOBAL_ANALYSISFORECAST_PHY_001_024/'
        + 'cmems_mod_glo_phy-cur_anfc_0.083deg_P1D-m_202406/'
        + 'sea_water_velocity';

    /**
     * Style — coloured magnitude + overlaid vector arrows on top of
     * the basemap. Alternatives: `vectorStyle:vector` (arrows only),
     * `vectorStyle:solid` (magnitude colours only).
     */
    private static readonly WMTS_STYLE = 'vectorStyle:solidAndVector,cmap:thermal';

    /**
     * Optional hard-pin for the time dimension (`YYYY-MM-DDTHH:mm:ss.SSSZ`
     * ISO). When `null`, today at 00:00 UTC is used. The upstream
     * product is updated daily so "today" is almost always valid.
     */
    private static readonly OVERRIDE_TIME: string | null = null;

    /**
     * @protected
     */
    protected _layer: TileLayer<WMTS> | undefined;

    public override getName(): string {
        return 'overlay_ocean_currents';
    }

    public override getTitle(): string {
        return 'Ocean currents (CMEMS 1/12°)';
    }

    public override getOlLayer(): BaseLayer {
        if (!this._layer) {
            const projection = getProjection('EPSG:3857')!;
            const extent = projection.getExtent();
            const size = getWidth(extent) / 256;
            const resolutions: number[] = [];
            const matrixIds: string[] = [];
            const maxZoom = 12;

            for (let z = 0; z <= maxZoom; z++) {
                resolutions.push(size / (2 ** z));
                matrixIds.push(String(z));
            }

            const tileGrid = new WMTSTileGrid({
                origin: getTopLeft(extent),
                resolutions: resolutions,
                matrixIds: matrixIds
            });

            this._layer = new TileLayer({
                source: new WMTS({
                    url: OceanCurrentsLayer.WMTS_BASE,
                    layer: OceanCurrentsLayer.WMTS_LAYER,
                    matrixSet: 'EPSG:3857',
                    format: 'image/png',
                    projection: projection,
                    tileGrid: tileGrid,
                    style: OceanCurrentsLayer.WMTS_STYLE,
                    crossOrigin: 'anonymous',
                    dimensions: {
                        time: OceanCurrentsLayer.OVERRIDE_TIME ?? OceanCurrentsLayer._todayUtcMidnight()
                    },
                    wrapX: true
                }),
                opacity: 0.6
            });
            this._layer.setVisible(false);
        }

        return this._layer;
    }

    /**
     * ISO timestamp for today at 00:00 UTC — what the daily-mean layer
     * is keyed on. Computed once per layer construction; an open map
     * across midnight UTC keeps the previous day until reload, which
     * is fine for the daily-mean product.
     * @private
     */
    private static _todayUtcMidnight(): string {
        const today = new Date().toISOString().slice(0, 10);
        return `${today}T00:00:00.000Z`;
    }

}