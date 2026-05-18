import BaseLayer from 'ol/layer/Base';
import TileLayer from 'ol/layer/Tile';
import {TileWMS} from 'ol/source';
import {MapLayer} from '../MapLayer';

/**
 * EMODnet bathymetry — sea-floor relief WMS overlay. Hidden by default
 * so the layer-switcher offers it as an opt-in without obscuring the
 * coastline on first load.
 */
export class BathymetryLayer extends MapLayer {

    /**
     * @protected
     */
    protected _layer: TileLayer<TileWMS> | undefined;

    public override getName(): string {
        return 'base_bathymetry_layer';
    }

    public override getTitle(): string {
        return 'EMODnet Bathymetry';
    }

    public override getOlLayer(): BaseLayer {
        if (!this._layer) {
            this._layer = new TileLayer({
                source: new TileWMS({
                    url: 'https://ows.emodnet-bathymetry.eu/wms',
                    params: {
                        LAYERS: 'mean_atlas_land'
                    }
                })
            });
            this._layer.set('base', true);
            this._layer.setVisible(false);
        }

        return this._layer;
    }

}