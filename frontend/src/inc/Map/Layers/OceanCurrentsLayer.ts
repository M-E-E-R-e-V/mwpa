import BaseLayer from 'ol/layer/Base';
import LayerGroup from 'ol/layer/Group';
import TileLayer from 'ol/layer/Tile';
import {TileWMS} from 'ol/source';
import {MapLayer} from '../MapLayer';

/**
 * NASA GIBS sea-surface currents overlay.
 *
 * Renders the **OSCAR L4 Zonal** (east-west) component as a coloured
 * tile overlay on top of the base map. GIBS only publishes the U and V
 * components separately (no combined magnitude/direction layer), and
 * the data series in GIBS lags ~12+ months — at the time of writing
 * the latest available date is 2024-07-17 (5-day cadence).
 *
 * Implementation notes:
 *   - Uses TileWMS straight to GIBS WMS so the overlay sits exactly on
 *     the OSM tile grid (any BBOX is rendered server-side). The earlier
 *     attempt routed through the `/mapcache` slippy-tile proxy with the
 *     OSCAR-native `2km` matrix set — that matrix has a different scale
 *     denominator series than OSM and tiles ended up offset / wrong
 *     size, which is what the user saw as "komische karte".
 *   - `TIME` is set to a known-available OSCAR date. Bump it when you
 *     want fresher data — check the WMS Capabilities `<Extent>` for
 *     `OSCAR_Sea_Surface_Currents_Zonal` to see the cut-off.
 *   - Disk caching via `/mapcache` is out of scope (WMS uses query-param
 *     BBOX rather than path-based slippy coords). HTTP and OL in-memory
 *     caches still apply.
 *
 * Caveat: OSCAR is **global L4** at 1/3° (~33 km). For a single island
 * that's only a handful of pixels — useful as Canary-Current basin
 * context, not for fine-scale local flow. Per-sighting current speed
 * and direction (already in `sighting_extended` from the Ocean service)
 * are what to look at for site-level analysis.
 *
 * Hidden by default so it doesn't compete with the productivity / SST
 * overlays on first open.
 */
export class OceanCurrentsLayer extends MapLayer {

    /**
     * Hard-coded recent date inside OSCAR's GIBS coverage. Update when
     * the layer feels stale — see the WMS Capabilities for cut-off.
     */
    private static readonly OSCAR_TIME: string = '2024-07-17';

    /**
     * @protected
     */
    protected _layer: LayerGroup | undefined;

    public override getName(): string {
        return 'overlay_ocean_currents';
    }

    public override getTitle(): string {
        return 'Ocean currents (OSCAR ⅓°)';
    }

    public override getOlLayer(): BaseLayer {
        if (!this._layer) {
            const zonal = new TileLayer({
                source: new TileWMS({
                    url: 'https://gibs.earthdata.nasa.gov/wms/epsg3857/best/wms.cgi',
                    crossOrigin: 'anonymous',
                    params: {
                        LAYERS: 'OSCAR_Sea_Surface_Currents_Zonal',
                        TIME: OceanCurrentsLayer.OSCAR_TIME,
                        FORMAT: 'image/png',
                        TRANSPARENT: true,
                        VERSION: '1.1.1'
                    }
                }),
                opacity: 0.55
            });
            zonal.set('title', 'OSCAR zonal (U, east-west)');

            const meridional = new TileLayer({
                source: new TileWMS({
                    url: 'https://gibs.earthdata.nasa.gov/wms/epsg3857/best/wms.cgi',
                    crossOrigin: 'anonymous',
                    params: {
                        LAYERS: 'OSCAR_Sea_Surface_Currents_Meridional',
                        TIME: OceanCurrentsLayer.OSCAR_TIME,
                        FORMAT: 'image/png',
                        TRANSPARENT: true,
                        VERSION: '1.1.1'
                    }
                }),
                opacity: 0.45
            });
            meridional.set('title', 'OSCAR meridional (V, north-south)');

            this._layer = new LayerGroup({
                layers: [zonal, meridional]
            });
            this._layer.setVisible(false);
        }

        return this._layer;
    }

}