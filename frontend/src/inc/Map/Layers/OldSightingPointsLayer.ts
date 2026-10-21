import {GeoJSON} from 'ol/format';
import BaseLayer from 'ol/layer/Base';
import VectorLayer from 'ol/layer/Vector';
import {unByKey} from 'ol/Observable';
import VectorSource from 'ol/source/Vector';
import {Circle, Fill, Stroke, Style} from 'ol/style';
import {MapLayer} from '../MapLayer';

/**
 * One historical sighting as a map point.
 */
export type OldSightingPoint = {
    id: number | string;
    lon: number;
    lat: number;
    content?: string | (() => string);
};

/**
 * Vector layer for the historical, hand-maintained sightings
 * (`sighting_old`, pre-app era).
 *
 * Deliberately decoupled from the metric overlays: old rows have no
 * ocean/fishing enrichment to colour by, and mixing them into the
 * effort-sensitive metric/chart pipeline would be misleading. They get
 * their own flat, muted marker (hollow grey circle) so they read clearly
 * as "historical context" and never get mistaken for a live, metric-
 * coloured sighting.
 *
 * Hidden by default — the user opts in via the LayerSwitcher (mirrors the
 * list's "show old data" toggle). The owning page lazy-loads the points
 * when the layer first becomes visible.
 */
export class OldSightingPointsLayer extends MapLayer {

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
    protected _points: OldSightingPoint[] = [];

    /**
     * Muted hollow-grey marker, shared across all features of this layer.
     * @protected
     */
    protected static readonly _STYLE: Style = new Style({
        image: new Circle({
            radius: 5,
            fill: new Fill({color: 'rgba(130,130,130,0.35)'}),
            stroke: new Stroke({color: '#555555', width: 1.5})
        })
    });

    public override getName(): string {
        return 'old_sightings_layer';
    }

    public override getTitle(): string {
        return 'Historical sightings (pre-app)';
    }

    public override getOlLayer(): BaseLayer {
        if (!this._layer) {
            this._source = new VectorSource({wrapX: false});
            this._layer = new VectorLayer({
                source: this._source,
                visible: false,
                style: (): Style[] => [OldSightingPointsLayer._STYLE]
            });
            this._layer.setZIndex(92);
        }

        return this._layer;
    }

    /**
     * Register a listener fired whenever the layer's visibility changes
     * (LayerSwitcher toggle). Returns an unsubscribe function. The owning
     * page uses this to lazy-load the points on first show.
     */
    public onVisibleChange(cb: (visible: boolean) => void): () => void {
        const layer = this.getOlLayer();
        const key = layer.on('change:visible', () => cb(layer.getVisible()));

        return (): void => {
            unByKey(key);
        };
    }

    public isVisible(): boolean {
        return this._layer?.getVisible() ?? false;
    }

    public setPoints(points: OldSightingPoint[]): void {
        this._points = points;
    }

    /**
     * Commit the buffered points to the layer's source, replacing whatever
     * was rendered before.
     */
    public refresh(): void {
        if (!this._source) {
            return;
        }

        this._source.clear(true);

        if (this._points.length === 0) {
            return;
        }

        const features = this._points.map((p) => ({
            type: 'Feature',
            properties: {
                id: p.id,
                content: p.content
            },
            geometry: {
                type: 'Point',
                coordinates: [p.lon, p.lat]
            }
        }));

        const collection = {
            type: 'FeatureCollection',
            crs: {type: 'name', properties: {name: 'EPSG:4326'}},
            features
        };

        const olFeatures = new GeoJSON().readFeatures(collection, {
            featureProjection: 'EPSG:3857'
        });
        this._source.addFeatures(olFeatures);
    }

}