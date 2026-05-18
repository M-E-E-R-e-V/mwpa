/* global JQuery */
import {Component} from 'bambooo';
import {MetricLayer, MetricRenderMode} from '../Layers/MetricLayer';

const escapeHtml = (s: string): string => s
.replace(/&/gu, '&amp;')
.replace(/</gu, '&lt;')
.replace(/>/gu, '&gt;');

/**
 * One declared data provider — the legend lists these even when no
 * matching layer is currently visible, so the user can see what feeds
 * into the page at a glance.
 */
export type ProvenanceEntry = {
    label: string;
    source: string;
    url?: string;
};

/**
 * Side panel listing the data sources that feed the page. Two sections:
 *
 *   - *Base maps & overlays*: static set passed in via
 *     {@link setStaticEntries} (OSM, EMODnet, IDEE, …) — always shown.
 *   - *Metric overlays*: dynamic — built from the metric layers
 *     registered via {@link setMetricLayers}. Only layers that are
 *     currently visible on the map appear, and each block carries a
 *     Points / Heatmap radio that drives {@link MetricLayer.setMode}.
 *
 * The legend subscribes to each metric layer's {@link MetricLayer.onChange}
 * so visibility toggles in the LayerSwitcher (and mode swaps from this
 * panel itself) re-render the panel in place.
 *
 * Re-renders fully on every update — the legend is small, diffing isn't
 * worth the code.
 */
export class ProvenanceLegend extends Component<HTMLDivElement> {

    /**
     * @protected
     */
    protected _staticEntries: ProvenanceEntry[] = [];

    /**
     * @protected
     */
    protected _metricLayers: MetricLayer[] = [];

    /**
     * Unsubscribe callbacks for the per-layer {@link MetricLayer.onChange}
     * subscriptions. Cleared whenever {@link setMetricLayers} replaces
     * the layer set.
     * @protected
     */
    protected _unsubscribers: (() => void)[] = [];

    public constructor(parent: JQuery) {
        const root = jQuery<HTMLDivElement>('<div class="map-provenance-legend"/>').appendTo(parent);
        super(root);
    }

    public setStaticEntries(entries: ProvenanceEntry[]): void {
        this._staticEntries = entries;
        this._render();
    }

    public setMetricLayers(layers: MetricLayer[]): void {
        for (const unsub of this._unsubscribers) {
            unsub();
        }
        this._unsubscribers = [];

        this._metricLayers = layers;

        for (const layer of layers) {
            this._unsubscribers.push(layer.onChange(() => this._render()));
        }

        this._render();
    }

    /**
     * @protected
     */
    protected _render(): void {
        this._element.empty();

        const card = jQuery('<div class="card"/>').appendTo(this._element);
        jQuery('<div class="card-header"><b>Data sources</b></div>').appendTo(card);
        const body = jQuery('<div class="card-body" style="font-size:0.85rem;"/>').appendTo(card);

        if (this._staticEntries.length > 0) {
            jQuery('<div style="font-weight:600;margin-bottom:4px;">Base maps &amp; overlays</div>').appendTo(body);
            const list = jQuery('<ul style="padding-left:18px;margin-bottom:12px;"/>').appendTo(body);

            for (const entry of this._staticEntries) {
                const li = jQuery('<li/>').appendTo(list);
                const label = `<b>${escapeHtml(entry.label)}</b>`;
                const src = escapeHtml(entry.source);
                if (entry.url) {
                    li.html(`${label}: <a href="${entry.url}" target="_blank" rel="noopener">${src}</a>`);
                } else {
                    li.html(`${label}: ${src}`);
                }
            }
        }

        const visibleMetrics = this._metricLayers.filter((l) => l.isVisible());

        if (visibleMetrics.length > 0) {
            jQuery('<div style="font-weight:600;margin-bottom:4px;">Active metric overlays</div>').appendTo(body);

            for (const layer of visibleMetrics) {
                this._renderMetricBlock(body, layer);
            }
        }

        if (this._staticEntries.length === 0 && visibleMetrics.length === 0) {
            jQuery('<div style="color:#888;">No data sources registered.</div>').appendTo(body);
        }
    }

    /**
     * @protected
     */
    protected _renderMetricBlock(parent: JQuery, layer: MetricLayer): void {
        const block = jQuery('<div style="margin-bottom:10px;"/>').appendTo(parent);
        jQuery(`<div><b>${escapeHtml(layer.getTitle())}</b></div>`).appendTo(block);
        jQuery(`<div style="color:#555;">${escapeHtml(layer.getUnit())}</div>`).appendTo(block);
        jQuery(`<div style="color:#555;font-size:0.75rem;">${escapeHtml(layer.getProvenance())}</div>`).appendTo(block);

        const scale = layer.getScale();
        const stops = scale.getStops();
        if (stops.length > 0) {
            const ramp = jQuery('<div style="display:flex;margin-top:4px;height:10px;border:1px solid #aaa;"/>').appendTo(block);
            for (const stop of stops) {
                jQuery(`<div style="flex:1;background:${stop};"/>`).appendTo(ramp);
            }
            jQuery(`<div style="display:flex;justify-content:space-between;font-size:0.7rem;color:#666;">
                <span>${scale.getMin()}</span>
                <span>${scale.getMax()}</span>
            </div>`).appendTo(block);
        }

        this._renderModeSwitch(block, layer);
    }

    /**
     * Two-radio inline switch wired to {@link MetricLayer.setMode}. The
     * radios share `name="mode-<layerName>"` so they form a group; the
     * change handler triggers the layer swap which fires
     * {@link MetricLayer.onChange} and re-renders the whole legend.
     * @protected
     */
    protected _renderModeSwitch(parent: JQuery, layer: MetricLayer): void {
        const name = `mode-${layer.getName()}`;
        const current = layer.getMode();

        const wrap = jQuery('<div style="margin-top:6px;font-size:0.75rem;color:#333;"/>').appendTo(parent);

        const make = (mode: MetricRenderMode, label: string): JQuery => {
            const id = `${name}-${mode}`;
            const checked = current === mode ? 'checked' : '';
            const radio = jQuery(`<label style="margin-right:10px;cursor:pointer;">
                <input type="radio" name="${name}" id="${id}" value="${mode}" ${checked} style="margin-right:4px;"/>
                ${label}
            </label>`);
            radio.find('input').on('change', () => {
                layer.setMode(mode);
            });
            return radio;
        };

        wrap.append(make('points', 'Points'));
        wrap.append(make('idw', 'IDW (interpolated mean)'));
    }

}