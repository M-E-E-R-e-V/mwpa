import {FeatureLike} from 'ol/Feature';
import {GeoJSON} from 'ol/format';
import BaseLayer from 'ol/layer/Base';
import ImageLayer from 'ol/layer/Image';
import VectorLayer from 'ol/layer/Vector';
import {fromLonLat} from 'ol/proj';
import ImageCanvasSource from 'ol/source/ImageCanvas';
import VectorSource from 'ol/source/Vector';
import {Circle, Fill, Stroke, Style} from 'ol/style';
import {MapLayer} from '../MapLayer';
import {IdwField, IdwPoint} from './IdwField';
import {IdwBlock, IdwRaster} from './IdwRaster';
import {MetricColorScale} from '../Styles/MetricColorScale';

/**
 * One sighting + its metric reading. `value === null` means the
 * provider returned no data for that sighting (clouds, land mask,
 * lookup not run yet) — rendered in neutral grey so the user still
 * sees the position.
 */
export type MetricPoint = {
    id: number | string;
    lon: number;
    lat: number;
    value: number | null;
    content?: string | (() => string);
};

/**
 * Render mode for a metric layer.
 *
 *   - `points` draws one filled circle per sighting (colour from the
 *     scale).
 *   - `idw` interpolates the metric value spatially using inverse-
 *     distance weighting of the K nearest sightings — answers
 *     "what's the *average* value around here?" rather than "how many
 *     sightings are around here?" (the latter is what a density-summing
 *     heatmap would show). Pixels with no sighting inside the support
 *     radius stay transparent.
 */
export type MetricRenderMode = 'points' | 'idw';

/**
 * Abstract per-metric vector layer.
 *
 * Each concrete subclass declares:
 *   - a stable layer name + LayerSwitcher title,
 *   - a {@link MetricColorScale} that maps the metric's value range
 *     to a colour ramp (subclasses can re-tune the scale by passing a
 *     different ramp or range to the constructor).
 *
 * The base class handles the rest: source/layer construction, GeoJSON
 * pipeline, and the per-feature style (filled circle, colour from
 * the scale).
 */
export abstract class MetricLayer extends MapLayer {

    /**
     * Search radius for the IDW renderer (metres). Points beyond this
     * distance from the pixel are ignored — so sparsely-sampled areas
     * stay transparent instead of being filled with extrapolated
     * values. 30 km is generous enough to bridge typical inter-track
     * spacing but small enough that an isolated track doesn't paint
     * half the map.
     * @protected
     */
    protected static readonly _IDW_RADIUS_M: number = 30000;

    /**
     * Max number of neighbouring sightings averaged per pixel.
     * @protected
     */
    protected static readonly _IDW_NEIGHBOURS: number = 8;

    /**
     * Pixel sampling step for the IDW canvas. Each computed pixel
     * paints a step×step block — at step=4 the work is cut 16× at
     * the cost of a slightly blocky surface.
     * @protected
     */
    protected static readonly _IDW_SAMPLE_STEP: number = 4;

    /**
     * Currently mounted OL layer. Swapped in place by
     * {@link setMode} — the source is preserved across the swap so
     * features don't need to be re-read.
     * @protected
     */
    protected _layer: BaseLayer | undefined;

    /**
     * @protected
     */
    protected _source: VectorSource | undefined;

    /**
     * Active IDW canvas source, set while the layer is in `idw` mode.
     * Cleared on mode swap so the next IDW build starts fresh.
     * @protected
     */
    protected _idwSource: ImageCanvasSource | undefined;

    /**
     * @protected
     */
    protected _scale: MetricColorScale;

    /**
     * @protected
     */
    protected _points: MetricPoint[] = [];

    /**
     * Both metric layers start hidden so the page can show the plain
     * sighting layer first; the user opts in via the LayerSwitcher.
     * @protected
     */
    protected _initiallyVisible: boolean = false;

    /**
     * @protected
     */
    protected _mode: MetricRenderMode = 'points';

    /**
     * @protected
     */
    protected _changeListeners: Set<() => void> = new Set();

    public constructor(scale: MetricColorScale) {
        super();
        this._scale = scale;
    }

    public override getOlLayer(): BaseLayer {
        if (!this._layer) {
            this._source = new VectorSource({wrapX: false});
            this._layer = this._buildOlLayer();
        }

        return this._layer;
    }

    public setPoints(points: MetricPoint[]): void {
        this._points = points;
    }

    public clear(): void {
        this._points = [];
        this._source?.clear(true);
    }

    public getScale(): MetricColorScale {
        return this._scale;
    }

    public getMode(): MetricRenderMode {
        return this._mode;
    }

    /**
     * Switch between point and IDW-interpolation rendering. Replaces
     * the underlying OL layer in place — the two modes use different
     * layer types (VectorLayer vs ImageLayer), so swapping the OL
     * layer is the cleanest path. The shared {@link _source} is
     * preserved across the swap (points mode still reads from it).
     *
     * Fires every registered {@link onChange} callback after the swap.
     */
    public setMode(mode: MetricRenderMode): void {
        if (mode === this._mode) {
            return;
        }

        this._mode = mode;
        this._idwSource = undefined;

        if (!this._layer) {
            // Layer not built yet — mode will be honoured at first getOlLayer().
            this._emitChange();
            return;
        }

        const base = this._base;
        const olMap = base?.getOlMap();
        if (!base || !olMap) {
            return;
        }

        const wasVisible = this._layer.getVisible();
        olMap.removeLayer(this._layer);

        this._layer = this._buildOlLayer();
        this._layer.set('name', this.getName());
        this._layer.set('title', this.getTitle());
        this._layer.setVisible(wasVisible);
        olMap.addLayer(this._layer);

        base.refreshLayerSwitcher();
        this._emitChange();
    }

    public isVisible(): boolean {
        return this._layer?.getVisible() ?? this._initiallyVisible;
    }

    /**
     * Register a listener fired whenever the layer's visibility
     * or render mode changes. Returns an unsubscribe function.
     */
    public onChange(cb: () => void): () => void {
        this._changeListeners.add(cb);
        return (): void => {
            this._changeListeners.delete(cb);
        };
    }

    /**
     * Provenance string surfaced by the legend panel. Subclasses report
     * the upstream data source (e.g. "NOAA CoastWatch ERDDAP").
     */
    public abstract getProvenance(): string;

    /**
     * Short unit/label shown next to the metric's value in the legend
     * (e.g. "mg/m³" or "hours / day @ 25 km").
     */
    public abstract getUnit(): string;

    /**
     * Commit the buffered points to the layer's source. Replaces what
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
                metric_value: p.value,
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

        /*
         * Invalidate the IDW canvas so a re-render picks up the new
         * points on the next pan/zoom (or immediately, if the layer
         * is currently visible).
         */
        this._idwSource?.changed();
    }

    /**
     * @protected
     */
    protected _styleFor(feature: FeatureLike): Style[] {
        const value = feature.get('metric_value') as number | null;
        const color = this._scale.colorFor(value);

        return [new Style({
            image: new Circle({
                radius: 7,
                fill: new Fill({color}),
                stroke: new Stroke({color: 'rgba(0,0,0,0.55)', width: 1})
            })
        })];
    }

    /**
     * Build a fresh OL layer for the current {@link _mode}, wiring the
     * visibility-change listener so external observers can react.
     *
     * IDW (interpolation) layers render below points (z=85 vs z=90)
     * so that a stacked combination of "metric A interpolated +
     * metric B as points" keeps the sighting positions visible on top
     * of the interpolated surface — matches the typical reading order
     * (background context + foreground markers).
     * @protected
     */
    protected _buildOlLayer(): BaseLayer {
        const layer: BaseLayer = this._mode === 'idw'
            ? this._buildIdwLayer()
            : this._buildPointsLayer();

        layer.setZIndex(this._mode === 'idw' ? 85 : 90);
        layer.on('change:visible', () => this._emitChange());
        return layer;
    }

    /**
     * @protected
     */
    protected _buildPointsLayer(): VectorLayer<VectorSource> {
        return new VectorLayer({
            source: this._source,
            visible: this._initiallyVisible,
            style: (feature: FeatureLike): Style[] => this._styleFor(feature)
        });
    }

    /**
     * Inverse-distance-weighted interpolation surface.
     *
     * For each pixel in the requested extent, looks up the K nearest
     * sightings within {@link _IDW_RADIUS_M} metres and computes the
     * weighted average of their metric values using `1 / d^2` weights.
     * Pixels with no sighting inside the radius stay transparent so
     * the user sees gaps where the data doesn't support extrapolation,
     * rather than a misleadingly-coloured ocean.
     *
     * Sampling step ({@link _IDW_SAMPLE_STEP}) trades resolution for
     * speed — each computed pixel paints a step×step block, so a step
     * of 4 cuts the work 16-fold at the cost of a blocky surface
     * (acceptable for an analytic overlay).
     *
     * OL caches the resulting canvas per (extent, resolution), so the
     * cost is paid once per pan/zoom, not per frame.
     * @protected
     */
    protected _buildIdwLayer(): ImageLayer<ImageCanvasSource> {
        const source = new ImageCanvasSource({
            ratio: 1,
            canvasFunction: (extent, _resolution, _pixelRatio, size): HTMLCanvasElement => {
                return this._paintIdwCanvas(extent, size);
            }
        });

        this._idwSource = source;

        return new ImageLayer({
            source,
            visible: this._initiallyVisible
        });
    }

    /**
     * @protected
     */
    protected _paintIdwCanvas(extent: number[], size: number[]): HTMLCanvasElement {
        const w = Math.max(1, Math.round(size[0]));
        const h = Math.max(1, Math.round(size[1]));

        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
            return canvas;
        }

        /*
         * Project points to the map projection (EPSG:3857) once per
         * paint. Drop null/NaN values — they have no contribution to
         * the weighted average.
         */
        const projected: IdwPoint[] = [];
        for (const p of this._points) {
            if (p.value !== null && Number.isFinite(p.value)) {
                const [x, y] = fromLonLat([p.lon, p.lat]);
                projected.push({x, y, v: p.value});
            }
        }

        if (projected.length === 0) {
            return canvas;
        }

        const imageData = ctx.createImageData(w, h);
        const data = imageData.data;

        const xMin = extent[0];
        const xMax = extent[2];
        const yMax = extent[3];
        const xSpan = xMax - xMin;
        const ySpan = yMax - extent[1];

        const radiusSq = MetricLayer._IDW_RADIUS_M * MetricLayer._IDW_RADIUS_M;
        const step = MetricLayer._IDW_SAMPLE_STEP;
        const field = new IdwField(projected, radiusSq, MetricLayer._IDW_NEIGHBOURS);
        const block: IdwBlock = {w, h, px: 0, py: 0, step};

        for (let py = 0; py < h; py += step) {
            // EPSG:3857 north is +y, canvas down is +py.
            const wy = yMax - (((py + 0.5) / h) * ySpan);

            for (let px = 0; px < w; px += step) {
                const wx = xMin + (((px + 0.5) / w) * xSpan);
                const value = field.valueAt(wx, wy);

                if (value !== null) {
                    block.px = px;
                    block.py = py;
                    IdwRaster.fillBlock(data, block, this._scale.colorForRgba(value, 0.7));
                }
            }
        }

        ctx.putImageData(imageData, 0, 0);
        return canvas;
    }

    /**
     * @protected
     */
    protected _emitChange(): void {
        for (const cb of this._changeListeners) {
            cb();
        }
    }

}