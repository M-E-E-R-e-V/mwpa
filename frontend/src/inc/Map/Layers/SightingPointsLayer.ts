import {FeatureLike} from 'ol/Feature';
import {GeoJSON} from 'ol/format';
import {Point} from 'ol/geom';
import BaseLayer from 'ol/layer/Base';
import VectorLayer from 'ol/layer/Vector';
import {fromLonLat} from 'ol/proj';
import Cluster from 'ol/source/Cluster';
import VectorSource from 'ol/source/Vector';
import {Circle as CircleStyle, Fill, Icon, Stroke, Style, Text} from 'ol/style';
import {MapLayer} from '../MapLayer';
import {SightingMapObjectType, SightingStyles} from '../Styles/SightingStyles';

/**
 * Tooltip body — either a static string or a thunk that builds one
 * lazily (used by the Sighting list to avoid HTML allocation for every
 * row that's not currently clicked).
 */
export type SightingMapPopupContent = () => string | any;

/**
 * Options of {@link SightingPointsLayer}.
 */
export type SightingPointsLayerOptions = {

    /**
     * Group nearby points into count bubbles (only for point-only data —
     * routes / boat markers are dropped by the cluster source).
     */
    cluster?: boolean;
};

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

    /**
     * Cluster source over {@link _source} (only with `cluster: true`)
     * @protected
     */
    protected _clusterSource: Cluster | undefined;

    /**
     * @protected
     */
    protected _cluster: boolean;

    /**
     * Cached bubble styles, keyed by type + count
     * @protected
     */
    protected static _clusterStyles: Map<string, Style> = new Map<string, Style>();

    /**
     * Bubble colour per sighting type (dominant type of the cluster).
     * @protected
     */
    protected static readonly _CLUSTER_COLORS: Record<string, string> = {
        [SightingMapObjectType.Mysticeti]: '#2e8b57',
        [SightingMapObjectType.Odontoceti]: '#2f6fb5',
        [SightingMapObjectType.Testudines]: '#c47f17'
    };

    public constructor(options: SightingPointsLayerOptions = {}) {
        super();
        this._cluster = options.cluster === true;
    }

    public override getName(): string {
        return 'sigthing_layer';
    }

    public override getTitle(): string {
        return 'Sightings';
    }

    public override getOlLayer(): BaseLayer {
        if (!this._layer) {
            this._source = new VectorSource({wrapX: false});

            if (this._cluster) {
                this._clusterSource = new Cluster({
                    distance: 40,
                    source: this._source,
                    geometryFunction: (feature): Point => {
                        const geometry = feature.getGeometry();

                        // OL skips features whose geometry function returns null (the typing only says Point)
                        return (geometry instanceof Point ? geometry : null) as unknown as Point;
                    }
                });
            }

            this._layer = new VectorLayer({
                source: this._clusterSource ?? this._source,
                style: (feature: FeatureLike): Style[] => this._cluster
                    ? SightingPointsLayer._clusterStyleFor(feature)
                    : SightingPointsLayer._styleFor(feature)
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
     * Cluster pixel distance (only with `cluster: true`). 0 still groups
     * sightings sharing the exact same position.
     * @param {number} distance
     */
    public setClusterDistance(distance: number): void {
        this._clusterSource?.setDistance(distance);
    }

    /**
     * Coordinates (EPSG:3857) of all sighting points.
     * @return {number[][]}
     */
    public getPointCoordinates(): number[][] {
        const points: number[][] = [];

        for (const feature of this._source?.getFeatures() ?? []) {
            const geometry = feature.getGeometry();

            if (geometry instanceof Point) {
                points.push(geometry.getCoordinates());
            }
        }

        return points;
    }

    /**
     * Extent of the points (EPSG:3857), undefined when empty. From 20 points
     * on, the outer 2 % per axis are ignored so single stray positions (e.g.
     * test sightings from an emulator on another continent) don't zoom the
     * view out to half the world.
     * @return {number[]|undefined}
     */
    public getDataExtent(): number[] | undefined {
        const xs: number[] = [];
        const ys: number[] = [];

        for (const feature of this._source?.getFeatures() ?? []) {
            const geometry = feature.getGeometry();

            if (geometry instanceof Point) {
                const [x, y] = geometry.getCoordinates();
                xs.push(x);
                ys.push(y);
            }
        }

        if (xs.length === 0) {
            return undefined;
        }

        xs.sort((a, b) => a - b);
        ys.sort((a, b) => a - b);

        const cut = xs.length >= 20 ? Math.floor(xs.length * 0.02) : 0;
        const last = xs.length - 1 - cut;

        return [xs[cut], ys[cut], xs[last], ys[last]];
    }

    /**
     * Style of a cluster feature: a single member keeps its normal pin, a
     * group becomes a count bubble coloured by its most frequent type.
     * @protected
     */
    protected static _clusterStyleFor(feature: FeatureLike): Style[] {
        const members = feature.get('features') as FeatureLike[] | undefined;

        if (!Array.isArray(members)) {
            return SightingPointsLayer._styleFor(feature);
        }

        if (members.length === 1) {
            return SightingPointsLayer._styleFor(members[0]);
        }

        const counts = new Map<string, number>();

        for (const member of members) {
            const type = `${member.get('pointtype') ?? ''}`;
            counts.set(type, (counts.get(type) ?? 0) + 1);
        }

        let dominant = '';
        let best = 0;

        for (const [type, count] of counts) {
            if (count > best) {
                best = count;
                dominant = type;
            }
        }

        const key = `${dominant}:${members.length}`;
        let style = SightingPointsLayer._clusterStyles.get(key);

        if (!style) {
            const color = SightingPointsLayer._CLUSTER_COLORS[dominant] ?? '#5b6b7b';
            const radius = 13 + Math.min(15, Math.log10(members.length) * 7);

            style = new Style({
                image: new CircleStyle({
                    radius,
                    fill: new Fill({color}),
                    stroke: new Stroke({color: 'rgba(255,255,255,0.9)', width: 3})
                }),
                text: new Text({
                    text: members.length >= 10000 ? `${Math.round(members.length / 1000)}k` : `${members.length}`,
                    font: '600 12px system-ui, -apple-system, "Segoe UI", sans-serif',
                    fill: new Fill({color: '#ffffff'})
                })
            });

            SightingPointsLayer._clusterStyles.set(key, style);
        }

        return [style];
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