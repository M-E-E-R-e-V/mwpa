import {Component} from 'bambooo';
import {Map as OlMap, Overlay, View} from 'ol';
import LayerSwitcher from 'ol-layerswitcher';
import {Coordinate} from 'ol/coordinate';
import {fromLonLat} from 'ol/proj';
import {MapLayer} from './MapLayer';

/**
 * Options for {@link BaseMap.load}.
 */
export type BaseMapLoadOptions = {

    /**
     * Initial view center as [lon, lat] in EPSG:4326.
     */
    initialCenterLonLat?: [number, number];

    /**
     * Initial zoom level. Defaults to 2.2 (whole-world view).
     */
    initialZoom?: number;

    /**
     * If false, the LayerSwitcher control is not added. Default: true.
     */
    withLayerSwitcher?: boolean;

    /**
     * If false, the click/hover popover infrastructure is not wired.
     * Default: true.
     */
    withPopover?: boolean;
};

/**
 * BaseMap — domain-free OpenLayers map shell.
 *
 * Owns:
 *   - the {@link OlMap} instance + a sane default view (WGS84 input,
 *     EPSG:3857 display, multiWorld wrap),
 *   - the {@link LayerSwitcher} control (rebuilt every refresh so
 *     dynamically added layers always show up in the legend),
 *   - a single click/hover Overlay that turns into a Bootstrap popover
 *     when a feature with a `content` property is clicked,
 *   - the registry of attached {@link MapLayer} modules.
 *
 * Does NOT know anything about sightings, tours, ocean metrics, etc.
 * Domain layers come in via {@link addLayer}.
 */
export class BaseMap extends Component<HTMLDivElement> {

    /**
     * @protected
     */
    protected _map: OlMap | undefined;

    /**
     * @protected
     */
    protected _layerSwitcher: LayerSwitcher | undefined;

    /**
     * Popover anchor element. Lives outside the map container so it
     * survives container re-renders.
     * @protected
     */
    protected _popoverAnchor: any;

    /**
     * @protected
     */
    protected _popover: any | undefined;

    /**
     * @protected
     */
    protected _options: BaseMapLoadOptions = {};

    /**
     * Layer modules attached via {@link addLayer}. Tracked separately
     * from the OL layer collection so callers can detach by name and
     * we can re-attach (e.g. after a base-layer swap) without losing
     * configuration.
     * @protected
     */
    protected _layers: MapLayer[] = [];

    public constructor(aelement?: any) {
        super(jQuery<HTMLDivElement>('<div></div>').appendTo(aelement));
    }

    /**
     * Create the underlying OL map + optional controls. Must be called
     * once before any other method.
     */
    public load(options?: BaseMapLoadOptions): void {
        if (options !== undefined) {
            this._options = options;
        }

        const centerLonLat = this._options.initialCenterLonLat ?? [11.030, 47.739];
        const zoom = this._options.initialZoom ?? 2.2;

        this._map = new OlMap({
            target: this._element[0],
            view: new View({
                center: fromLonLat(centerLonLat),
                zoom,
                multiWorld: true
            })
        });

        if (this._options.withPopover !== false) {
            this._createPopover();
        }

        if (this._options.withLayerSwitcher !== false) {
            this._mountLayerSwitcher();
        }
    }

    /**
     * Tear down popover anchor + layers. The OL map itself is left for
     * the caller to drop (we keep parity with the legacy widget's
     * "unload only drops side effects" semantics).
     */
    public unload(): void {
        jQuery('.popover').remove();

        if (this._popoverAnchor) {
            this._popoverAnchor.remove();
            this._popoverAnchor = undefined;
        }

        for (const layer of this._layers) {
            layer.detach();
        }
        this._layers = [];
    }

    /**
     * @returns the underlying OL Map, or undefined if {@link load} hasn't
     * been called yet.
     */
    public getOlMap(): OlMap | undefined {
        return this._map;
    }

    /**
     * Set the visible viewport. Pass a Coordinate already projected to
     * the view projection (EPSG:3857) — use `fromLonLat([lon, lat])` at
     * the call site.
     */
    public setView(viewCenter: Coordinate | null = null, viewZoom: number = 12.5): void {
        if (!this._map) {
            return;
        }

        const center = viewCenter ?? fromLonLat([-17.3340221, 28.0525008]);

        this._map.setView(new View({
            center,
            zoom: viewZoom,
            multiWorld: true
        }));
    }

    /**
     * Set the element height (px). The OL map needs an explicit height
     * to size its canvas — without this the map renders 0 px tall.
     */
    public setHeight(height: string | number): void {
        this._element.css({
            height: `${height}px`
        });
    }

    /**
     * Inform OL that the container size has changed (e.g. after a tab
     * switch or sidebar collapse). Cheap no-op when the map isn't
     * loaded yet.
     */
    public updateSize(): void {
        this._map?.updateSize();
    }

    /**
     * Attach a layer module. Idempotent: re-attaching a layer that's
     * already registered (same `getName()`) replaces it.
     */
    public addLayer(layer: MapLayer): void {
        if (!this._map) {
            return;
        }

        const existingIdx = this._layers.findIndex((l) => l.getName() === layer.getName());
        if (existingIdx !== -1) {
            const existing = this._layers[existingIdx];
            existing.detach();
            this._layers.splice(existingIdx, 1);
        }

        layer.attachTo(this);
        this._layers.push(layer);

        this.refreshLayerSwitcher();
    }

    /**
     * Detach the layer registered under `name`. No-op if no such layer.
     */
    public removeLayerByName(name: string): void {
        const idx = this._layers.findIndex((l) => l.getName() === name);
        if (idx === -1) {
            return;
        }

        const [layer] = this._layers.splice(idx, 1);
        layer.detach();

        this.refreshLayerSwitcher();
    }

    /**
     * Lookup an attached layer by its registered name. Useful when the
     * page needs to forward a domain call (e.g. addSighting, addArea)
     * onto a specific layer module.
     */
    public getLayerByName<T extends MapLayer = MapLayer>(name: string): T | undefined {
        return this._layers.find((l) => l.getName() === name) as T | undefined;
    }

    /**
     * All currently attached layers in attach order.
     */
    public getLayers(): MapLayer[] {
        return [...this._layers];
    }

    /**
     * Dispose the click-popover if one is currently open.
     */
    public disposePopover(andRemove: boolean = false): void {
        if (this._popover) {
            this._popover.popover('dispose');

            if (andRemove) {
                this._popover.remove();
            }

            this._popover = undefined;
        }
    }

    /**
     * Rebuild the LayerSwitcher control. Called after any add/remove so
     * dynamic layers always appear in the legend. Public because some
     * layers (e.g. {@link MetricLayer}) swap their underlying OL layer
     * in place and need to re-register with the switcher.
     */
    public refreshLayerSwitcher(): void {
        if (!this._map || this._options.withLayerSwitcher === false) {
            return;
        }

        if (this._layerSwitcher) {
            this._map.removeControl(this._layerSwitcher);
        }

        this._mountLayerSwitcher();
    }

    /**
     * @protected
     */
    protected _mountLayerSwitcher(): void {
        if (!this._map) {
            return;
        }

        this._layerSwitcher = new LayerSwitcher({
            reverse: true,
            groupSelectStyle: 'group'
        });

        this._map.addControl(this._layerSwitcher);
    }

    /**
     * Wire the click/hover popover infrastructure. Looks up a `content`
     * property on the clicked feature and renders it as a Bootstrap
     * popover. `content` may be a string or a function returning a
     * string / DOM node — the same shape the legacy widget accepted, so
     * existing callers don't have to change.
     * @protected
     */
    protected _createPopover(): void {
        if (!this._map) {
            return;
        }

        this._popoverAnchor = jQuery('<div id="popup"></div>').appendTo(jQuery('body'));

        const overlay = new Overlay({
            element: this._popoverAnchor[0],
            offset: [10, 0],
            positioning: 'bottom-left'
        });

        this._map.addOverlay(overlay);

        this._map.on('click', (evt) => {
            if (!this._map) {
                return;
            }

            const feature = this._map.forEachFeatureAtPixel(evt.pixel, (f) => f);

            this.disposePopover();

            if (!feature) {
                return;
            }

            overlay.setPosition(evt.coordinate);

            this._popover = this._popoverAnchor.popover({
                html: true,
                content: () => {
                    const content = feature.get('content');

                    if (typeof content === 'string') {
                        return content;
                    } else if (typeof content === 'function') {
                        const returnContent = content();

                        if (typeof returnContent === 'string') {
                            return returnContent;
                        } else if (typeof returnContent === 'object') {
                            return jQuery(returnContent).html();
                        }
                    }

                    return 'None content found.';
                }
            });

            this._popover.popover('show');
        });

        this._map.on('pointermove', (evt) => {
            if (!this._map) {
                return;
            }

            const pixel = this._map.getEventPixel(evt.originalEvent);
            const hit = this._map.hasFeatureAtPixel(pixel);
            const target = this._map.getTarget();

            if (target && typeof target !== 'string' && 'style' in target) {
                target.style.cursor = hit ? 'pointer' : '';
            }
        });

        this._map.on('movestart', () => {
            this.disposePopover();
        });
    }

}