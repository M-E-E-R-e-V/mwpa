import BaseLayer from 'ol/layer/Base';
import {BaseMap} from './BaseMap';

/**
 * Abstract pluggable map layer.
 *
 * Concrete subclasses construct an OL {@link BaseLayer} (Tile, Vector,
 * Heatmap, …), set the `title` / `name` / `base` properties consumed by
 * `ol-layerswitcher`, and expose domain methods (`addSighting`,
 * `setMetricValues`, etc.) that mutate the layer's source.
 *
 * Lifecycle:
 *   - `attachTo(base)` is called by {@link BaseMap.addLayer} — the
 *     concrete subclass uses it to push its `BaseLayer` onto the map.
 *   - `detach()` is called when the layer is removed — it must pull
 *     the same `BaseLayer` back out so the LayerSwitcher stops
 *     listing it.
 *
 * The base class tracks the owning `BaseMap` reference so subclasses
 * can re-render their content (rebuild features, swap styles, etc.)
 * without re-implementing attach/detach plumbing.
 */
export abstract class MapLayer {

    /**
     * @protected
     */
    protected _base: BaseMap | undefined;

    /**
     * Stable name used as the layer's `name` property and by
     * {@link BaseMap.getLayerByName}. Must be unique per BaseMap.
     */
    public abstract getName(): string;

    /**
     * Human-readable label shown by the LayerSwitcher control.
     */
    public abstract getTitle(): string;

    /**
     * The underlying OL layer. Created lazily by the subclass.
     */
    public abstract getOlLayer(): BaseLayer;

    /**
     * Attach to a BaseMap. The default implementation pushes the
     * subclass's `getOlLayer()` onto the map and stamps the standard
     * LayerSwitcher properties.
     */
    public attachTo(base: BaseMap): void {
        this._base = base;

        const olMap = base.getOlMap();
        if (!olMap) {
            return;
        }

        const layer = this.getOlLayer();
        layer.set('name', this.getName());
        layer.set('title', this.getTitle());

        olMap.addLayer(layer);
    }

    /**
     * Detach from the owning BaseMap. The default implementation pulls
     * `getOlLayer()` back out of the OL map.
     */
    public detach(): void {
        if (!this._base) {
            return;
        }

        const olMap = this._base.getOlMap();
        if (olMap) {
            olMap.removeLayer(this.getOlLayer());
        }

        this._base = undefined;
    }

    /**
     * @returns the BaseMap this layer is currently attached to, or
     * undefined when standalone.
     */
    public getBaseMap(): BaseMap | undefined {
        return this._base;
    }

}