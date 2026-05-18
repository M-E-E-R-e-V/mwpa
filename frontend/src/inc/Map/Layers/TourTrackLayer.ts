import {GeoJSON} from 'ol/format';
import BaseLayer from 'ol/layer/Base';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import {Stroke, Style} from 'ol/style';
import {MapLayer} from '../MapLayer';

/**
 * Vector layer for the boat's tracked path of one tour. One simple
 * polyline — direction-arrow markers (every Nth point) and per-sighting
 * sub-segments live on companion layers so the visual layers stay
 * independently togglable.
 *
 * Build coordinates with {@link setTrack} ([[lon, lat], …] in WGS84),
 * then call {@link refresh} to commit.
 */
export class TourTrackLayer extends MapLayer {

    /**
     * @protected
     */
    protected _layer: VectorLayer<VectorSource> | undefined;

    /**
     * @protected
     */
    protected _source: VectorSource | undefined;

    /**
     * @protected
     */
    protected _coords: number[][] = [];

    public override getName(): string {
        return 'tour_track_layer';
    }

    public override getTitle(): string {
        return 'Tour track';
    }

    public override getOlLayer(): BaseLayer {
        if (!this._layer) {
            this._source = new VectorSource({wrapX: false});
            this._layer = new VectorLayer({
                source: this._source,
                style: new Style({
                    stroke: new Stroke({
                        width: 2,
                        color: 'rgba(255,0,0,0.5)'
                    })
                })
            });
            this._layer.setZIndex(60);
        }

        return this._layer;
    }

    public setTrack(coords: number[][]): void {
        this._coords = coords;
    }

    public refresh(): void {
        if (!this._source) {
            return;
        }

        this._source.clear(true);

        if (this._coords.length < 2) {
            return;
        }

        const collection = {
            type: 'FeatureCollection',
            crs: {
                type: 'name',
                properties: {
                    name: 'EPSG:4326'
                }
            },
            features: [{
                type: 'Feature',
                properties: {},
                geometry: {
                    type: 'LineString',
                    coordinates: this._coords
                }
            }]
        };

        const olFeatures = new GeoJSON().readFeatures(collection, {
            featureProjection: 'EPSG:3857'
        });
        this._source.addFeatures(olFeatures);
    }

}