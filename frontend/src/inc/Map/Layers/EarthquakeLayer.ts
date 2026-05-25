import {FeatureLike} from 'ol/Feature';
import {GeoJSON} from 'ol/format';
import BaseLayer from 'ol/layer/Base';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import {Circle, Fill, Stroke, Style} from 'ol/style';
import {EarthquakeEntry} from '../../Api/Earthquake';
import {MapLayer} from '../MapLayer';

/**
 * Vector layer for imported earthquake events. Renders each event as
 * a circle whose radius scales with magnitude and whose color shades
 * by depth (shallow = bright red, deep = washed-out brown). Click /
 * hover popovers come for free via the standard MapLayer pipeline.
 */
export class EarthquakeLayer extends MapLayer {

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
    protected _features: object[] = [];

    public override getName(): string {
        return 'earthquake_layer';
    }

    public override getTitle(): string {
        return 'Earthquakes';
    }

    public override getOlLayer(): BaseLayer {
        if (!this._layer) {
            this._source = new VectorSource({wrapX: false});
            this._layer = new VectorLayer({
                source: this._source,
                style: (feature: FeatureLike): Style[] => EarthquakeLayer._styleFor(feature)
            });
            this._layer.setZIndex(94);
        }
        return this._layer;
    }

    /**
     * Replace the buffered features with the supplied earthquake list.
     * Followed by {@link refresh} to commit.
     */
    public setEarthquakes(quakes: EarthquakeEntry[]): void {
        this._features = quakes.map((q) => ({
            type: 'Feature',
            properties: {
                pointtype: 'earthquake',
                id: q.id,
                magnitude: q.magnitude,
                depth_km: q.depth_km ?? 0,
                event_time_ms: q.event_time_ms,
                place: q.place,
                magnitude_type: q.magnitude_type,
                url: q.url
            },
            geometry: {
                type: 'Point',
                coordinates: [q.lon, q.lat]
            }
        }));
    }

    public refresh(): void {
        if (!this._source) {
            return;
        }
        this._source.clear(true);
        if (this._features.length === 0) {
            return;
        }
        const collection = {
            type: 'FeatureCollection',
            crs: {type: 'name', properties: {name: 'EPSG:4326'}},
            features: this._features
        };
        const olFeatures = new GeoJSON().readFeatures(collection, {featureProjection: 'EPSG:3857'});
        this._source.addFeatures(olFeatures);
    }

    /**
     * Magnitude → circle radius (px). Linear within the usual 2.5–7
     * range; clamped at the edges so a giant M 8 doesn't paint half
     * the screen.
     */
    private static _radiusFor(mag: number): number {
        const clamped = Math.max(2, Math.min(8, mag));
        return 3 + (clamped - 2) * 2.5;
    }

    /**
     * Depth → fill color. Shallow events sit at the strongest red;
     * deeper events fade toward a muted ochre. Helps the eye pick out
     * the shallow ones (which are the ones whales would actually feel).
     */
    private static _fillFor(depthKm: number): string {
        if (!Number.isFinite(depthKm)) {
            return 'rgba(220, 53, 69, 0.7)';
        }
        if (depthKm < 30) {
            return 'rgba(220, 53, 69, 0.75)';
        }
        if (depthKm < 100) {
            return 'rgba(253, 126, 20, 0.65)';
        }
        return 'rgba(133, 100, 60, 0.55)';
    }

    protected static _styleFor(feature: FeatureLike): Style[] {
        const props = feature.getProperties() || {};
        if (props.pointtype !== 'earthquake') {
            return [];
        }
        const mag = Number(props.magnitude) || 0;
        const depth = Number(props.depth_km) || 0;

        return [new Style({
            image: new Circle({
                radius: EarthquakeLayer._radiusFor(mag),
                fill: new Fill({color: EarthquakeLayer._fillFor(depth)}),
                stroke: new Stroke({color: 'rgba(0,0,0,0.65)', width: 1})
            })
        })];
    }

}