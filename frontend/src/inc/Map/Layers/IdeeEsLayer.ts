import BaseLayer from 'ol/layer/Base';
import TileLayer from 'ol/layer/Tile';
import {ProjectionLike} from 'ol/proj';
import XYZ from 'ol/source/XYZ';
import {MapLayer} from '../MapLayer';

/**
 * IDEE ES — Spanish national relief tiles served through the local
 * mapcache. Useful base layer for the Canary Islands focus area;
 * opt-in (visible by default since the legacy widget had it on).
 */
export class IdeeEsLayer extends MapLayer {

    /**
     * @protected
     */
    protected _layer: TileLayer<XYZ> | undefined;

    public override getName(): string {
        return 'base_idee_es_layer';
    }

    public override getTitle(): string {
        return 'IDEE ES';
    }

    public override getOlLayer(): BaseLayer {
        if (!this._layer) {
            this._layer = new TileLayer({
                source: new XYZ({
                    url: '/mapcache/tms-relieve.idee.es/{z}/{x}/{-y}.jpeg',
                    projection: 'EPSG:3857' as ProjectionLike
                }),
                visible: true
            });
            this._layer.set('base', true);
        }

        return this._layer;
    }

}