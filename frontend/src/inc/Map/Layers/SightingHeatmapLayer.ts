import {Heatmap} from 'ol/layer';
import BaseLayer from 'ol/layer/Base';
import VectorSource from 'ol/source/Vector';
import {MapLayer} from '../MapLayer';

/**
 * Heatmap overlay sharing its source with a {@link SightingPointsLayer}.
 * Every point contributes a constant weight — the value is hard-coded
 * because the legacy widget didn't expose it and downstream pages
 * never asked.
 *
 * Pass the points layer's source via {@link setSource} before attaching
 * to the BaseMap so the heatmap renders together with the points.
 */
export class SightingHeatmapLayer extends MapLayer {

    /**
     * @protected
     */
    protected _layer: Heatmap | undefined;

    /**
     * @protected
     */
    protected _source: VectorSource | undefined;

    public override getName(): string {
        return 'sigthing_heat_layer';
    }

    public override getTitle(): string {
        return 'HeatMap';
    }

    /**
     * Provide the shared source — call before {@link getOlLayer} (i.e.
     * before {@link MapLayer.attachTo}). The companion points layer's
     * `getSource()` is the canonical input.
     */
    public setSource(source: VectorSource): void {
        this._source = source;
    }

    public override getOlLayer(): BaseLayer {
        if (!this._layer) {
            this._layer = SightingHeatmapLayer._buildLayer(this._source);
        }

        return this._layer;
    }

    /**
     * Rebuild the OL Heatmap layer in place. Required after the shared
     * VectorSource gets refilled — OL's Heatmap renderer rasterises the
     * gradient once at construction time and addFeatures alone doesn't
     * always trigger a fresh paint when the source started empty. The
     * legacy widget worked around this by recreating the whole layer on
     * every `_printLayer()`; we mirror that here.
     *
     * Safe to call before attachment (no-op until the layer is built).
     */
    public refresh(): void {
        if (!this._base || !this._layer) {
            return;
        }

        const olMap = this._base.getOlMap();
        if (!olMap) {
            return;
        }

        const wasVisible = this._layer.getVisible();

        olMap.removeLayer(this._layer);
        this._layer = SightingHeatmapLayer._buildLayer(this._source);
        this._layer.set('name', this.getName());
        this._layer.set('title', this.getTitle());
        this._layer.setVisible(wasVisible);
        olMap.addLayer(this._layer);
    }

    /**
     * @protected
     */
    protected static _buildLayer(source: VectorSource | undefined): Heatmap {
        const blur = 20;
        const radius = 10;

        /*
         * OL types insist on VectorSource<Point>; the points layer hands
         * us VectorSource<Geometry> whose features happen to all be
         * Points. Cast via `any` matches the legacy widget's workaround
         * (see git blame on SightingMap.ts).
         */
        const layer = new Heatmap({
            source: source as any,
            blur,
            radius,
            weight: (): number => 10
        });
        layer.setZIndex(98);
        return layer;
    }

}