/* global JQuery */
import {ComponentType, Widget2} from 'bambooo';
import {Map as OlMap, Overlay, View} from 'ol';
import LayerSwitcher from 'ol-layerswitcher';
import {Coordinate} from 'ol/coordinate';
import {boundingExtent, getHeight, getWidth} from 'ol/extent';
import {FeatureLike} from 'ol/Feature';
import {Point} from 'ol/geom';
import {fromLonLat} from 'ol/proj';
import {Lang} from '../Lang';
import {MapLayer} from './MapLayer';

/**
 * Options for {@link BaseMap.load}.
 */
/**
 * Popover action callback: `data-map-action` and `data-map-value` of the
 * clicked element.
 */
export type BaseMapPopupActionFn = (action: string, value: string) => void;

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
export class BaseMap extends Widget2 {

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
     * Called when a `[data-map-action]` element inside the popover is clicked.
     * @protected
     */
    protected _onPopupAction: BaseMapPopupActionFn | null = null;

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

    public constructor(aelement?: ComponentType) {
        super({
            element: jQuery<HTMLDivElement>('<div></div>')
        });

        this._element.appendTo(BaseMap._asParent(aelement));
    }

    /**
     * Resolve a parent element (bambooo component, jQuery, DOM node or
     * selector) to a jQuery handle the map container can be appended to.
     * @param {ComponentType} element
     * @return {JQuery}
     * @protected
     */
    protected static _asParent(element?: ComponentType): JQuery {
        const maybe = element as {getElement?: () => JQuery;} | null | undefined;

        if (maybe && typeof maybe.getElement === 'function') {
            return maybe.getElement();
        }

        return jQuery(element as JQuery.Selector);
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
     * Handle clicks on `[data-map-action]` elements in the popover content.
     * The element's `data-map-action` and `data-map-value` attributes are
     * passed on; the popover closes afterwards. The content is serialised
     * HTML, so this is the way to give it live actions.
     * @param {BaseMapPopupActionFn|null} fn
     */
    public setOnPopupAction(fn: BaseMapPopupActionFn | null): void {
        this._onPopupAction = fn;
    }

    /**
     * Dispose the click-popover if one is currently open.
     */
    public disposePopover(andRemove: boolean = false): void {
        if (this._popover) {
            // Bootstrap 5 vanilla Popover instance — tear it down via dispose().
            this._popover.dispose();
            this._popover = undefined;
        }

        if (andRemove && this._popoverAnchor) {
            this._popoverAnchor.remove();
            this._popoverAnchor = undefined;
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
     * Return the Bootstrap 5 Popover constructor from the global bundle
     * (loaded via the `bootstrap.bundle` script tag), or undefined if absent.
     * @protected
     */
    protected _getBsPopover(): any {
        return (window as unknown as {bootstrap?: {Popover?: any;};}).bootstrap?.Popover;
    }

    /**
     * Wire the click/hover popover infrastructure. Looks up a `content`
     * property on the clicked feature and renders it as a Bootstrap
     * popover. `content` may be a string or a function returning a
     * string / DOM node — the same shape the legacy widget accepted, so
     * existing callers don't have to change.
     * @protected
     */
    /**
     * Popover HTML of a feature's `content` property (string or thunk
     * returning a string / element), null when it has none.
     * @param {FeatureLike} feature
     * @return {string|null}
     * @protected
     */
    protected static _contentOf(feature: FeatureLike): string | null {
        const content = feature.get('content');

        if (typeof content === 'string') {
            return content;
        }

        if (typeof content === 'function') {
            const returnContent = content();

            if (typeof returnContent === 'string') {
                return returnContent;
            }

            if (typeof returnContent === 'object') {
                return jQuery(returnContent).html() ?? '';
            }
        }

        return null;
    }

    /**
     * Zoom to the members of a cluster when they are spread out and the view
     * can still zoom in.
     * @param {FeatureLike[]} members
     * @return {boolean} true when zoomed
     * @protected
     */
    protected _zoomToMembers(members: FeatureLike[]): boolean {
        const view = this._map?.getView();

        if (!view) {
            return false;
        }

        const coordinates = members
        .map((member) => member.getGeometry())
        .filter((geometry): geometry is Point => geometry instanceof Point)
        .map((geometry) => geometry.getCoordinates());

        if (coordinates.length === 0) {
            return false;
        }

        const extent = boundingExtent(coordinates);
        const zoom = view.getZoom() ?? 0;

        // all at (nearly) the same spot, or nothing left to zoom into
        if ((getWidth(extent) < 5 && getHeight(extent) < 5) || zoom >= 17) {
            return false;
        }

        view.fit(extent, {
            padding: [80, 80, 80, 80],
            maxZoom: 17,
            duration: 350
        });

        return true;
    }

    /**
     * Popover for several features at one position: the first three plus
     * the number of further ones.
     * @param {FeatureLike[]} members
     * @return {string}
     * @protected
     */
    protected _membersContent(members: FeatureLike[]): string {
        const lang = Lang.i();
        const parts: string[] = [];

        for (const member of members.slice(0, 3)) {
            const content = BaseMap._contentOf(member);

            if (content !== null) {
                parts.push(content);
            }
        }

        const head = `<div class="small fw-semibold mb-2">${members.length} ${lang.l('sightings at this position')}</div>`;
        const more = members.length > 3
            ? `<div class="small text-body-secondary mt-2">+ ${members.length - 3} ${lang.l('more')}</div>`
            : '';

        return `${head}${parts.join('<hr class="my-2">')}${more}`;
    }

    /**
     * Wire the action elements of the open popover to {@link _onPopupAction}.
     * @protected
     */
    protected _bindPopupActions(): void {
        const tipId = this._popoverAnchor?.attr('aria-describedby') as string | undefined;
        const tip = tipId ? document.getElementById(tipId) : null;

        if (!tip) {
            return;
        }

        jQuery(tip).on('click', '[data-map-action]', (event) => {
            event.preventDefault();

            const target = jQuery(event.currentTarget);
            const action = `${target.attr('data-map-action') ?? ''}`;
            const value = `${target.attr('data-map-value') ?? ''}`;

            this.disposePopover();
            this._onPopupAction?.(action, value);
        });
    }

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

            const hit = this._map.forEachFeatureAtPixel(evt.pixel, (f) => f);

            this.disposePopover();

            if (!hit) {
                return;
            }

            /*
             * Cluster feature (ol/source/Cluster): a group spread over an area
             * zooms in; a group at one position (or at max zoom) lists its
             * members in the popover; a single member behaves like a point.
             */
            const members = hit.get('features') as FeatureLike[] | undefined;
            let feature: FeatureLike = hit;
            let html: string | null = null;

            if (Array.isArray(members) && members.length > 0) {
                feature = members[0];

                if (members.length > 1) {
                    if (this._zoomToMembers(members)) {
                        return;
                    }

                    html = this._membersContent(members);
                }
            }

            overlay.setPosition(evt.coordinate);

            const Popover = this._getBsPopover();

            if (!Popover || !this._popoverAnchor) {
                return;
            }

            /*
             * Bootstrap 5 removed the jQuery `$(el).popover()` plugin — use the
             * vanilla `new bootstrap.Popover(el, {...})` API (mirrors bambooo v2
             * BaseMap). `trigger: 'manual'` + explicit `.show()` keeps the
             * click-to-open behaviour; dispose() tears it down.
             */
            this._popover = new Popover(this._popoverAnchor[0], {
                html: true,
                /*
                 * Bootstrap 5 sanitizes popover HTML by default, which strips
                 * inline `style` attributes — that blanked the feature content
                 * (species badges carry their colour as `style="background:…"`
                 * and the label as `<b style="color:…">`, so sanitizing left an
                 * invisible white-on-transparent badge). We build this HTML
                 * ourselves, so disable the sanitizer.
                 */
                sanitize: false,
                trigger: 'manual',
                content: (): string => html ?? BaseMap._contentOf(feature) ?? 'None content found.'
            });

            this._popover.show();
            this._bindPopupActions();
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