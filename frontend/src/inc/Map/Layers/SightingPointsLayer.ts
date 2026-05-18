import {FeatureLike} from 'ol/Feature';
import {GeoJSON} from 'ol/format';
import {Point} from 'ol/geom';
import BaseLayer from 'ol/layer/Base';
import VectorLayer from 'ol/layer/Vector';
import {fromLonLat} from 'ol/proj';
import VectorSource from 'ol/source/Vector';
import {Icon, Style} from 'ol/style';
import {MapLayer} from '../MapLayer';
import {SightingMapObjectType, SightingStyles} from '../Styles/SightingStyles';

/**
 * Tooltip body — either a static string or a thunk that builds one
 * lazily (used by the Sighting list to avoid HTML allocation for every
 * row that's not currently clicked).
 */
export type SightingMapPopupContent = () => string | any;

/**
 * Vector layer for sighting points, per-sighting route lines and the
 * special boat-direction marker used by the Tour map. Features are
 * accumulated via {@link addSighting} / {@link addLineRoute} /
 * {@link addRawObject} and committed to OL on {@link refresh}.
 *
 * Feature pipeline:
 *   1. caller pushes GeoJSON-shaped feature objects into the buffer,
 *   2. refresh() rebuilds a single VectorSource from the buffer (cheap
 *      enough for the few-thousand-feature datasets this codebase sees,
 *      and matches the legacy widget's "rebuild on every refresh"
 *      semantics so consumers don't have to track diffs),
 *   3. the layer's style function dispatches per-feature based on the
 *      `pointtype` property: standard styles come from
 *      {@link SightingStyles}, while `boat` features get a one-off
 *      rotated icon computed from start/end coords.
 */
export class SightingPointsLayer extends MapLayer {

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
        return 'sigthing_layer';
    }

    public override getTitle(): string {
        return 'Sightings';
    }

    public override getOlLayer(): BaseLayer {
        if (!this._layer) {
            this._source = new VectorSource({wrapX: false});
            this._layer = new VectorLayer({
                source: this._source,
                style: (feature: FeatureLike): Style[] => SightingPointsLayer._styleFor(feature)
            });
            this._layer.setZIndex(99);
        }

        return this._layer;
    }

    /**
     * Add a sighting point. `coordinate` is [lon, lat] in WGS84.
     */
    public addSighting(
        type: SightingMapObjectType | string,
        id: string | number,
        content: string | SightingMapPopupContent,
        coordinate: number[]
    ): void {
        this._features.push({
            type: 'Feature',
            properties: {
                pointtype: `${type}`,
                id,
                content
            },
            geometry: {
                type: 'Point',
                coordinates: coordinate
            }
        });
    }

    /**
     * Add a polyline (e.g. the tour's full boat track). Coordinates are
     * [[lon, lat], …] in WGS84.
     */
    public addLineRoute(coordinates: number[][]): void {
        this._features.push({
            type: 'Feature',
            properties: {
                pointtype: `${SightingMapObjectType.Route}`
            },
            geometry: {
                type: 'LineString',
                coordinates
            }
        });
    }

    /**
     * Push a raw GeoJSON-shaped feature object. Escape hatch for callers
     * that need to set custom properties (e.g. the Tour map's boat
     * direction markers, which carry `start` / `end` coords used by the
     * rotation-aware style).
     */
    public addRawObject(object: object): void {
        this._features.push(object);
    }

    /**
     * Drop every buffered feature without touching the live layer.
     * Followed by {@link refresh} for a full replace.
     */
    public clearFeatures(): void {
        this._features = [];
    }

    /**
     * Commit the buffered features to the layer's source. Replaces
     * whatever was rendered before — matches the legacy widget's
     * "rebuild on every refresh" semantics.
     */
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
            crs: {
                type: 'name',
                properties: {
                    name: 'EPSG:4326'
                }
            },
            features: this._features
        };

        const olFeatures = new GeoJSON().readFeatures(collection, {
            featureProjection: 'EPSG:3857'
        });
        this._source.addFeatures(olFeatures);
    }

    /**
     * @returns the live VectorSource so siblings (e.g. heatmap layer)
     * can render off the same features. Undefined until the OL layer
     * has been built.
     */
    public getSource(): VectorSource | undefined {
        return this._source;
    }

    /**
     * Style dispatcher: `boat` features need per-instance rotation
     * computed from their start/end props; everything else falls back to
     * the static {@link SightingStyles} registry.
     * @protected
     */
    protected static _styleFor(feature: FeatureLike): Style[] {
        const styles: Style[] = [];
        const props = feature.getProperties() || {};

        if (!props.pointtype) {
            return styles;
        }

        if (props.pointtype === SightingMapObjectType.Boat) {
            const pstart = props.start as number[];
            const pend = props.end as number[];

            const dx = pend[0] - pstart[0];
            const dy = pend[1] - pstart[1];
            const rotation = Math.atan2(dy, dx);

            styles.push(new Style({
                geometry: new Point(fromLonLat(pstart)),
                image: new Icon({
                    src: 'images/boat.png',
                    anchor: [0.5, 0.5],
                    rotateWithView: true,
                    rotation: -rotation,
                    size: [752, 752],
                    scale: 0.08
                })
            }));
            return styles;
        }

        const style = SightingStyles.get(props.pointtype);

        if (style) {
            styles.push(style);
        }

        return styles;
    }

}