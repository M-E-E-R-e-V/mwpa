import BaseLayer from 'ol/layer/Base';
import TileLayer from 'ol/layer/Tile';
import XYZ from 'ol/source/XYZ';
import {MapLayer} from '../MapLayer';

/**
 * EMODnet bathymetry — sea-floor relief overlay (mean-depth atlas,
 * the tiled equivalent of the former `mean_atlas_land` WMS layer).
 * Served through the local mapcache proxy (`emodnet-bathymetry` upstream
 * → EMODnet's web-mercator `mean_atlas_land` tiles under `/latest/`) so
 * tiles are disk-cached like the OSM / IDEE base layers instead of
 * hitting EMODnet on every pan. Hidden by default so the layer-switcher
 * offers it as an opt-in without obscuring the coastline on first load.
 */
export class BathymetryLayer extends MapLayer {

    /**
     * @protected
     */
    protected _layer: TileLayer<XYZ> | undefined;

    public override getName(): string {
        return 'base_bathymetry_layer';
    }

    public override getTitle(): string {
        return 'EMODnet Bathymetry';
    }

    public override getOlLayer(): BaseLayer {
        if (!this._layer) {
            this._layer = new TileLayer({
                source: new XYZ({
                    url: '/mapcache/emodnet-bathymetry/{z}/{x}/{y}.png'
                })
            });
            this._layer.set('base', true);
            this._layer.setVisible(false);
        }

        return this._layer;
    }

}