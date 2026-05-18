import BaseLayer from 'ol/layer/Base';
import TileLayer from 'ol/layer/Tile';
import XYZ from 'ol/source/XYZ';
import {MapLayer} from '../MapLayer';

/**
 * OSM base tile layer served through the local mapcache proxy.
 * Always-on background — `base=true` so the LayerSwitcher groups it
 * with the other base layers.
 */
export class OsmBaseLayer extends MapLayer {

    /**
     * @protected
     */
    protected _layer: TileLayer<XYZ> | undefined;

    public override getName(): string {
        return 'base_osm_layer';
    }

    public override getTitle(): string {
        return 'OpenStreetMap';
    }

    public override getOlLayer(): BaseLayer {
        if (!this._layer) {
            this._layer = new TileLayer({
                source: new XYZ({
                    url: '/mapcache/openstreetmap/{z}/{x}/{y}.png'
                })
            });
            this._layer.set('base', true);
        }

        return this._layer;
    }

}