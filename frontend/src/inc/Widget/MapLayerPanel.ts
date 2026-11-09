/* global JQuery */
import {BaseMap} from '../Map/BaseMap';
import {ProtectedAreaInfo, ProtectedAreaLayer} from '../Map/Layers/ProtectedAreaLayer';
import {Lang} from '../Lang';

/**
 * Floating layer panel for a {@link BaseMap} (replaces the OpenLayers
 * LayerSwitcher on the sighting map): "Layers" button top right opens a card
 * with
 *   - Background — the base layers as radio buttons,
 *   - Overlays — the other layers as switches (layers listed in `skip` are
 *     handled elsewhere, e.g. the sighting points / heatmap display switch),
 *   - Protected areas — a master switch, status / source line, filter (with
 *     sightings / all), the type legend and one row per area with switch,
 *     sighting count and a zoom-to-area link.
 */
export class MapLayerPanel {

    /**
     * Readable names of the known layers (English source text).
     * @protected
     */
    protected static readonly _LABELS: Record<string, string> = {
        base_osm_layer: 'OpenStreetMap',
        base_idee_es_layer: 'Relief (IDEE Spain)',
        base_bathymetry_layer: 'Sea depth (EMODnet)',
        sigthing_movement_layer: 'Movement tracks'
    };

    protected _base: BaseMap;

    protected _skip: Set<string>;

    protected _root: JQuery;

    protected _card: JQuery;

    protected _layersEl: JQuery;

    protected _areaSection: JQuery;

    protected _areaStatus: JQuery;

    protected _areaList: JQuery;

    protected _areaSwitch: JQuery<HTMLInputElement>;

    protected _areaLayer: ProtectedAreaLayer | null = null;

    protected _areaCounts: Map<string, number> | null = null;

    /**
     * Areas the user switched by hand (the automatic "with sightings"
     * default no longer applies to them).
     * @protected
     */
    protected _areaManual: Set<string> = new Set<string>();

    protected _onlyWithSightings: boolean = true;

    protected static _idCounter: number = 0;

    /**
     * @param {JQuery} parent positioned container of the map
     * @param {BaseMap} base
     * @param {string[]} skip layer names not to list
     */
    public constructor(parent: JQuery, base: BaseMap, skip: string[] = []) {
        const lang = Lang.i();

        this._base = base;
        this._skip = new Set<string>(skip);

        this._root = jQuery('<div class="mwpa-layer-panel"/>').appendTo(parent);

        const toggle = jQuery('<button type="button" class="btn btn-light btn-sm shadow-sm mwpa-layer-panel-toggle"/>').appendTo(this._root);
        jQuery('<i class="fas fa-layer-group me-1"/>').appendTo(toggle);
        jQuery('<span/>').text(lang.l('Layers')).appendTo(toggle);

        this._card = jQuery('<div class="card shadow mwpa-layer-panel-card d-none"/>').appendTo(this._root);
        const header = jQuery('<div class="card-header d-flex align-items-center py-2"/>').appendTo(this._card);
        jQuery('<span class="fw-semibold"/>').text(lang.l('Map layers')).appendTo(header);
        const close = jQuery('<button type="button" class="btn-close ms-auto"/>').attr('aria-label', lang.l('Close')).appendTo(header);

        const body = jQuery('<div class="card-body p-3 d-flex flex-column gap-3"/>').appendTo(this._card);
        this._layersEl = jQuery('<div class="d-flex flex-column gap-3"/>').appendTo(body);

        // protected areas
        this._areaSection = jQuery('<div class="d-none"/>').appendTo(body);
        const areaHead = jQuery('<div class="d-flex align-items-center mb-1"/>').appendTo(this._areaSection);
        MapLayerPanel._heading(areaHead, 'fas fa-leaf', 'Protected areas (Natura 2000)');
        const masterWrap = jQuery('<div class="form-check form-switch mb-0 ms-auto"/>').appendTo(areaHead);
        this._areaSwitch = jQuery<HTMLInputElement>('<input class="form-check-input" type="checkbox" role="switch" checked>')
        .attr('title', lang.l('Show protected areas'))
        .appendTo(masterWrap);
        this._areaSwitch.on('change', (): void => {
            this._areaLayer?.getOlLayer().setVisible(this._areaSwitch.prop('checked') === true);
            this._areaList.toggleClass('opacity-50', this._areaSwitch.prop('checked') !== true);
        });

        this._areaStatus = jQuery('<div class="small text-body-secondary mb-2"/>').appendTo(this._areaSection);

        const legend = jQuery('<div class="d-flex flex-wrap gap-2 small mb-2"/>').appendTo(this._areaSection);

        for (const type of ['B', 'A', 'C']) {
            const info = ProtectedAreaLayer.typeInfo(type);
            const item = jQuery('<span class="d-inline-flex align-items-center gap-1"/>').attr('title', lang.l(info.label)).appendTo(legend);
            jQuery('<span class="d-inline-block rounded-1"/>')
            .css({width: '12px', height: '12px', border: `2px solid ${info.color}`, background: `${info.color}33`})
            .appendTo(item);
            jQuery('<span/>').text(info.short).appendTo(item);
        }

        const filter = jQuery('<div class="btn-group btn-group-sm w-100 mb-2" role="group"/>').appendTo(this._areaSection);
        const btnWith = jQuery('<button type="button" class="btn btn-primary"/>').text(lang.l('With sightings')).appendTo(filter);
        const btnAll = jQuery('<button type="button" class="btn btn-outline-primary"/>').text(lang.l('All areas')).appendTo(filter);

        const setFilter = (onlyWith: boolean): void => {
            this._onlyWithSightings = onlyWith;
            btnWith.toggleClass('btn-primary', onlyWith).toggleClass('btn-outline-primary', !onlyWith);
            btnAll.toggleClass('btn-primary', !onlyWith).toggleClass('btn-outline-primary', onlyWith);
            this._renderAreas();
        };

        btnWith.on('click', (): void => setFilter(true));
        btnAll.on('click', (): void => setFilter(false));

        this._areaList = jQuery('<div class="list-group list-group-flush small mwpa-layer-panel-areas"/>').appendTo(this._areaSection);

        toggle.on('click', (): void => {
            this._card.toggleClass('d-none');

            if (!this._card.hasClass('d-none')) {
                this.refresh();
            }
        });

        close.on('click', (): void => {
            this._card.addClass('d-none');
        });
    }

    /**
     * Section heading.
     * @param {JQuery} parent
     * @param {string} icon
     * @param {string} title English source text
     * @protected
     */
    protected static _heading(parent: JQuery, icon: string, title: string): void {
        const head = jQuery('<div class="fw-semibold small text-uppercase text-body-secondary"/>').appendTo(parent);
        jQuery('<i class="me-1"/>').addClass(icon).appendTo(head);
        jQuery('<span/>').text(Lang.i().l(title)).appendTo(head);
    }

    /**
     * Rebuild the background / overlay sections from the map's layers.
     */
    public refresh(): void {
        const lang = Lang.i();
        const layers = this._base.getLayers().filter((layer) => !this._skip.has(layer.getName()) && layer !== this._areaLayer);
        const baseLayers = layers.filter((layer) => layer.getOlLayer().get('base') === true);
        const overlays = layers.filter((layer) => layer.getOlLayer().get('base') !== true);

        this._layersEl.empty();
        const radioName = `mwpa-layer-base-${++MapLayerPanel._idCounter}`;

        if (baseLayers.length > 0) {
            const section = jQuery('<div/>').appendTo(this._layersEl);
            MapLayerPanel._heading(section, 'fas fa-map', 'Background');
            const list = jQuery('<div class="mt-1"/>').appendTo(section);

            for (const layer of baseLayers) {
                const id = `${radioName}-${layer.getName()}`;
                const wrap = jQuery('<div class="form-check"/>').appendTo(list);
                const input = jQuery<HTMLInputElement>('<input class="form-check-input" type="radio">')
                .attr({id, name: radioName})
                .prop('checked', layer.getOlLayer().getVisible())
                .appendTo(wrap);
                jQuery('<label class="form-check-label"/>').attr('for', id).text(lang.l(MapLayerPanel._LABELS[layer.getName()] ?? layer.getTitle())).appendTo(wrap);

                input.on('change', (): void => {
                    for (const other of baseLayers) {
                        other.getOlLayer().setVisible(other === layer);
                    }
                });
            }
        }

        if (overlays.length > 0) {
            const section = jQuery('<div/>').appendTo(this._layersEl);
            MapLayerPanel._heading(section, 'fas fa-clone', 'Overlays');
            const list = jQuery('<div class="mt-1"/>').appendTo(section);

            for (const layer of overlays) {
                const id = `mwpa-layer-${++MapLayerPanel._idCounter}`;
                const wrap = jQuery('<div class="form-check form-switch"/>').appendTo(list);
                const input = jQuery<HTMLInputElement>('<input class="form-check-input" type="checkbox" role="switch">')
                .attr('id', id)
                .prop('checked', layer.getOlLayer().getVisible())
                .appendTo(wrap);
                jQuery('<label class="form-check-label"/>').attr('for', id).text(lang.l(MapLayerPanel._LABELS[layer.getName()] ?? layer.getTitle())).appendTo(wrap);

                input.on('change', (): void => {
                    layer.getOlLayer().setVisible(input.prop('checked') === true);
                });
            }
        }
    }

    /**
     * Status line of the protected areas (shown with or without areas).
     * @param {string} text already translated
     */
    public setAreaStatus(text: string): void {
        this._areaSection.removeClass('d-none');
        this._areaStatus.text(text);
    }

    /**
     * Protected area layer with its loaded areas.
     * @param {ProtectedAreaLayer} layer
     */
    public setAreaLayer(layer: ProtectedAreaLayer): void {
        this._areaLayer = layer;
        this._areaSection.removeClass('d-none');
        this._applyDefaults();
        this._renderAreas();
    }

    /**
     * Sightings per area (by code); areas with sightings are shown by default.
     * @param {Map<string, number>} counts
     */
    public setAreaCounts(counts: Map<string, number>): void {
        this._areaCounts = counts;
        this._applyDefaults();
        this._renderAreas();
    }

    /**
     * Default visibility: areas with sightings on, the rest off — except the
     * ones the user switched by hand. Without counts yet, all are shown.
     * @protected
     */
    protected _applyDefaults(): void {
        if (!this._areaLayer) {
            return;
        }

        for (const area of this._areaLayer.getAreas()) {
            if (!this._areaManual.has(area.code)) {
                const count = this._areaCounts?.get(area.code);
                this._areaLayer.setAreaVisible(area.code, count === undefined ? true : count > 0);
            }
        }
    }

    /**
     * Rows of the area list.
     * @protected
     */
    protected _renderAreas(): void {
        const lang = Lang.i();
        const layer = this._areaLayer;
        this._areaList.empty();

        if (!layer) {
            return;
        }

        const count = (area: ProtectedAreaInfo): number => this._areaCounts?.get(area.code) ?? 0;
        let areas = layer.getAreas();

        if (this._onlyWithSightings && this._areaCounts !== null) {
            areas = areas.filter((area) => count(area) > 0 || layer.isAreaVisible(area.code));
        }

        areas.sort((a, b) => (count(b) - count(a)) || a.name.localeCompare(b.name));

        if (areas.length === 0) {
            jQuery('<div class="text-body-secondary py-2"/>').text(lang.l('No protected area contains loaded sightings.')).appendTo(this._areaList);
            return;
        }

        for (const area of areas) {
            const type = ProtectedAreaLayer.typeInfo(area.site_type);
            const row = jQuery('<div class="list-group-item px-0 py-1 d-flex align-items-start gap-2 bg-transparent"/>').appendTo(this._areaList);
            const id = `mwpa-area-${++MapLayerPanel._idCounter}`;

            const input = jQuery<HTMLInputElement>('<input class="form-check-input mt-1 flex-shrink-0" type="checkbox">')
            .attr('id', id)
            .prop('checked', layer.isAreaVisible(area.code))
            .css({borderColor: type.color})
            .appendTo(row);

            input.on('change', (): void => {
                this._areaManual.add(area.code);
                layer.setAreaVisible(area.code, input.prop('checked') === true);
            });

            const text = jQuery('<div class="flex-grow-1 lh-sm" style="min-width:0;"/>').appendTo(row);
            const name = jQuery('<a href="#" class="text-decoration-none fw-semibold d-block text-truncate"/>')
            .text(area.name)
            .attr('title', `${area.name} — ${lang.l('zoom to area')}`)
            .css('color', type.color)
            .appendTo(text);

            name.on('click', (e): void => {
                e.preventDefault();
                this._zoomTo(area.code);
            });

            jQuery('<div class="text-body-secondary"/>')
            .text(`${type.short} · ${area.code} · ${area.area_km2.toLocaleString()} km²`)
            .appendTo(text);

            const n = count(area);

            if (this._areaCounts !== null) {
                jQuery('<span class="badge rounded-pill border flex-shrink-0"/>')
                .addClass(n > 0 ? 'text-primary-emphasis bg-primary-subtle border-primary-subtle' : 'text-body-secondary bg-body-tertiary')
                .attr('title', lang.l('Sightings in this area'))
                .text(n.toLocaleString())
                .appendTo(row);
            }
        }
    }

    /**
     * Zoom to an area and make sure it is shown.
     * @param {string} code
     * @protected
     */
    protected _zoomTo(code: string): void {
        const extent = this._areaLayer?.getAreaExtent(code);
        const view = this._base.getOlMap()?.getView();

        if (!extent || !view || !this._areaLayer) {
            return;
        }

        this._areaManual.add(code);
        this._areaLayer.setAreaVisible(code, true);
        this._areaLayer.getOlLayer().setVisible(true);
        this._areaSwitch.prop('checked', true);
        this._renderAreas();

        view.fit(extent, {padding: [60, 60, 60, 60], duration: 400, maxZoom: 14});
    }

}