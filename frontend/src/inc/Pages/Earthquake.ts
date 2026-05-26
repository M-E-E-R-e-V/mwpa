import {
    Card,
    ContentCol,
    ContentColSize,
    ContentRow,
    LangText,
    LeftNavbarLink
} from 'bambooo';
import * as d3raw from 'd3';
import moment from 'moment';
import {fromLonLat} from 'ol/proj';
import {
    Earthquake as EarthquakeAPI,
    EarthquakeEntry,
    EarthquakeFilter,
    EarthquakeImpactAnalytics,
    EarthquakeImpactBucket,
    EarthquakeImpactRequest,
    EarthquakeImpactSighting,
    EarthquakeImpactTrack
} from '../Api/Earthquake';
import {StatusCodes} from '../Api/Status/StatusCodes';
import {Lang} from '../Lang';
import {BaseMap} from '../Map/BaseMap';
import {EarthquakeLayer} from '../Map/Layers/EarthquakeLayer';
import {MovementTracksLayer} from '../Map/Layers/MovementTracksLayer';
import {OsmBaseLayer} from '../Map/Layers/OsmBaseLayer';
import {SightingPointsLayer} from '../Map/Layers/SightingPointsLayer';
import {SightingMapObjectType} from '../Map/Styles/SightingStyles';
import {BasePage} from './BasePage';

// Same untyped-d3 pattern as Species/Profile.ts — see comment there.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const d3: any = d3raw;

/**
 * Earthquake admin page.
 *
 * Three stacked cards:
 *   1. Filter — period + min-magnitude (lists earthquakes), plus a
 *      "Tag X" date + window-days selector for the impact analysis.
 *   2. Map — earthquake circles always visible; in impact mode the
 *      affected sightings and their movement tracks layer on top, and
 *      the focus quake(s) gain a thicker outline.
 *   3. Events table — clickable rows; a click triggers impact mode for
 *      that earthquake.
 *
 * Below the map an "Auswertung" card shows the four impact analytics
 * histograms (by species / behaviour / encounter / signed hours-offset)
 * and is hidden in plain list mode.
 *
 * Imports themselves run on an hourly cron (EarthquakeService); there
 * is no manual import trigger here.
 */
export class Earthquake extends BasePage {

    public static NAME: string = 'earthquakes';

    private static readonly WINDOW_OPTIONS: {value: number; labelKey: string; hint: string;}[] = [
        {value: 0, labelKey: 'Hide sightings', hint: 'window.hint.off'},
        {value: 1, labelKey: '±24 h', hint: 'window.hint.24h'},
        {value: 3, labelKey: '±3 days', hint: 'window.hint.3d'},
        {value: 7, labelKey: '±7 days', hint: 'window.hint.7d'},
        {value: 14, labelKey: '±14 days', hint: 'window.hint.14d'}
    ];

    protected override _name: string = Earthquake.NAME;

    /**
     * Filter controls — raw jQuery refs because the bambooo widgets
     * don't accept loose div parents and dragging in FormRow/FormGroup
     * just for five inputs isn't worth it.
     */
    protected _periodFrom: JQuery<HTMLInputElement> | null = null;
    protected _periodTo: JQuery<HTMLInputElement> | null = null;
    protected _minMag: JQuery<HTMLInputElement> | null = null;
    protected _windowSel: JQuery<HTMLSelectElement> | null = null;

    /**
     * Map handle + the three vector layers — earthquakes, sightings,
     * movement tracks. Disposed in unloadContent.
     */
    protected _map: BaseMap | null = null;
    protected _eqLayer: EarthquakeLayer | null = null;
    protected _sightingLayer: SightingPointsLayer | null = null;
    protected _movementLayer: MovementTracksLayer | null = null;

    /**
     * Impact card (the "Auswertung" panel) plus the 4 host divs for
     * its bar charts. Card is hidden until impact mode is active.
     */
    protected _impactCard: Card | null = null;
    protected _hostSpecies: HTMLDivElement | null = null;
    protected _hostBehaviour: HTMLDivElement | null = null;
    protected _hostEncounter: HTMLDivElement | null = null;
    protected _hostHours: HTMLDivElement | null = null;
    protected _impactSummary: JQuery<HTMLDivElement> | null = null;

    /**
     * Last earthquake-id list the impact panel was loaded for. Cached
     * so we know whether the table reload should re-trigger the
     * (potentially expensive) impact endpoint or just re-pan the map.
     */
    protected _lastImpactIds: number[] = [];

    /**
     * Latest earthquake list rendered into the table — kept on the
     * instance so the window-dropdown change handler can trigger a
     * fresh impact load without re-fetching the list.
     */
    protected _currentList: EarthquakeEntry[] = [];

    public override async unloadContent(): Promise<void> {
        if (this._map) {
            this._map.unload();
            this._map = null;
        }
        this._eqLayer = null;
        this._sightingLayer = null;
        this._movementLayer = null;
        this._impactCard = null;
    }

    public override async loadContent(): Promise<void> {
        const lang = Lang.i();
        const contentWrapper = this._wrapper.getContentWrapper().getContent();

        // Filter card --------------------------------------------------------------------------------------------

        const rowFilter = new ContentRow(contentWrapper);
        const filterCard = new Card(new ContentCol(rowFilter, ContentColSize.col12));
        filterCard.setTitle(new LangText('Earthquakes'));

        const filterBody = jQuery('<div class="card-body d-flex flex-wrap align-items-end" style="gap: 1rem;"/>').appendTo(filterCard.getBodyElement());

        const buildField = (label: string, type: 'date' | 'number'): JQuery<HTMLInputElement> => {
            const wrap = jQuery('<div/>').appendTo(filterBody);
            jQuery(`<div class="text-muted small">${label}</div>`).appendTo(wrap);
            return jQuery<HTMLInputElement>(`<input type="${type}" class="form-control form-control-sm" style="width: 12rem;">`).appendTo(wrap);
        };

        this._periodFrom = buildField(lang.l('Period from'), 'date');
        this._periodTo = buildField(lang.l('Period to'), 'date');
        this._minMag = buildField(lang.l('Min magnitude'), 'number');
        this._minMag.attr('placeholder', '2.5').attr('step', '0.1');

        const btnApply = jQuery<HTMLButtonElement>(
            `<button type="button" class="btn btn-sm btn-primary"><i class="fa fa-filter"></i> ${lang.l('Apply')}</button>`
        ).appendTo(filterBody);
        btnApply.on('click', async() => {
            await this._reload();
        });

        // Visual separator between "list filter" and "impact controls".
        jQuery('<div style="width:1px;background:#dee2e6;align-self:stretch;"/>').appendTo(filterBody);

        const windowWrap = jQuery('<div/>').appendTo(filterBody);
        jQuery(`<div class="text-muted small">${lang.l('Impact window')}</div>`).appendTo(windowWrap);
        this._windowSel = jQuery<HTMLSelectElement>('<select class="form-control form-control-sm" style="width: 18rem;"/>').appendTo(windowWrap);
        this._windowSel.attr('title', lang.l('Impact window hint'));
        for (const opt of Earthquake.WINDOW_OPTIONS) {
            jQuery<HTMLOptionElement>(`<option value="${opt.value}"></option>`)
                .text(lang.l(opt.labelKey))
                .attr('title', lang.l(opt.hint))
                .appendTo(this._windowSel);
        }
        // Default to "off" — no automatic impact load on first paint.
        this._windowSel.val('0');
        this._windowSel.on('change', async() => {
            await this._refreshImpactForCurrentList();
        });

        // Visual separator before recorrelate.
        jQuery('<div style="width:1px;background:#dee2e6;align-self:stretch;"/>').appendTo(filterBody);

        const btnRecorrelate = jQuery<HTMLButtonElement>(
            `<button type="button" class="btn btn-sm btn-warning"><i class="fa fa-link"></i> ${lang.l('Recorrelate all')}</button>`
        ).appendTo(filterBody);
        btnRecorrelate.on('click', async() => {
            // eslint-disable-next-line no-alert
            const ok = window.confirm(lang.l('Recorrelate confirm'));
            if (!ok) {
                return;
            }
            btnRecorrelate.attr('disabled', 'disabled');
            try {
                const res = await EarthquakeAPI.runRecorrelate();
                if (res && res.events !== undefined) {
                    this._toast.fire({
                        icon: 'success',
                        title: `${lang.l('Recorrelate done')}: events=${res.events} / sighting-seismic ${res.correlations}`
                    });
                } else if (res?.msg) {
                    this._toast.fire({icon: 'error', title: res.msg});
                }
            } catch (e) {
                this._toast.fire({icon: 'error', title: (e as Error).message});
            } finally {
                btnRecorrelate.removeAttr('disabled');
            }
        });

        // Map card -----------------------------------------------------------------------------------------------

        const rowMap = new ContentRow(contentWrapper);
        const mapCard = new Card(new ContentCol(rowMap, ContentColSize.col12));
        mapCard.setTitle(new LangText('Map'));
        this._map = new BaseMap(mapCard.getBodyElement());
        this._map.setHeight(Math.max(500, window.innerHeight - 380));
        // Zoom 5 over (-15, 28) frames the full Canaries archipelago +
        // Moroccan shelf — at 6 only the central islands fit.
        this._map.load({initialCenterLonLat: [-15, 28], initialZoom: 5});
        this._map.addLayer(new OsmBaseLayer());

        this._eqLayer = new EarthquakeLayer();
        this._map.addLayer(this._eqLayer);

        this._sightingLayer = new SightingPointsLayer();
        this._map.addLayer(this._sightingLayer);

        this._movementLayer = new MovementTracksLayer();
        this._map.addLayer(this._movementLayer);

        // Impact "Auswertung" card --------------------------------------------------------------------------------

        const rowImpact = new ContentRow(contentWrapper);
        this._impactCard = new Card(new ContentCol(rowImpact, ContentColSize.col12));
        this._impactCard.setTitle(new LangText('Impact analysis'));

        const impactBody = jQuery('<div class="card-body"/>').appendTo(this._impactCard.getBodyElement());
        this._impactSummary = jQuery<HTMLDivElement>('<div class="mb-3"/>').appendTo(impactBody);

        const grid = jQuery('<div class="row"/>').appendTo(impactBody);
        const buildChart = (title: string): HTMLDivElement => {
            const col = jQuery('<div class="col-md-6 mb-3"/>').appendTo(grid);
            jQuery(`<div class="small text-muted mb-1">${title}</div>`).appendTo(col);
            return jQuery<HTMLDivElement>('<div style="min-height: 160px;"/>').appendTo(col)[0] as HTMLDivElement;
        };
        this._hostSpecies = buildChart(lang.l('By species'));
        this._hostBehaviour = buildChart(lang.l('By behaviour'));
        this._hostEncounter = buildChart(lang.l('By encounter category'));
        this._hostHours = buildChart(lang.l('Hours offset (signed)'));

        jQuery(this._impactCard.getBodyElement()).hide();

        // Table card ---------------------------------------------------------------------------------------------

        const rowTable = new ContentRow(contentWrapper);
        const tableCard = new Card(new ContentCol(rowTable, ContentColSize.col12));
        tableCard.setTitle(new LangText('Events'));

        const tableHost = jQuery<HTMLDivElement>('<div class="card-body p-0" style="max-height: 480px; overflow-y: auto;"/>').appendTo(tableCard.getBodyElement());
        const table = jQuery<HTMLTableElement>('<table class="table table-sm table-striped table-hover mb-0"/>').appendTo(tableHost);
        table.append(
            '<thead><tr>' +
            `<th>${lang.l('When')}</th>` +
            `<th class="text-right">${lang.l('Mag')}</th>` +
            `<th class="text-right">${lang.l('Depth (km)')}</th>` +
            `<th>${lang.l('Place')}</th>` +
            `<th class="text-right">${lang.l('Lat')}</th>` +
            `<th class="text-right">${lang.l('Lon')}</th>` +
            `<th>${lang.l('Source')}</th>` +
            '</tr></thead>'
        );
        const tbody = jQuery<HTMLTableSectionElement>('<tbody/>').appendTo(table);

        this._onLoadTable = async(): Promise<void> => {
            tableCard.showLoading();
            try {
                const filter: EarthquakeFilter = this._readListFilter();
                const res = await EarthquakeAPI.getList(filter);
                tbody.empty();

                const list: EarthquakeEntry[] = res?.list ?? [];
                this._currentList = list;
                tableCard.setTitle(new LangText(`${lang.l('Events')} (${list.length}${res?.count !== undefined && res.count > list.length ? `/${res.count}` : ''})`));

                if (this._eqLayer && this._map) {
                    this._eqLayer.setEarthquakes(list);
                    this._eqLayer.refresh();
                    if (list.length > 0) {
                        const avgLon = list.reduce((s, e) => s + e.lon, 0) / list.length;
                        const avgLat = list.reduce((s, e) => s + e.lat, 0) / list.length;
                        // Keep the archipelago-overview zoom — setView's
                        // default of 12.5 would crop down to a single island.
                        this._map.setView(fromLonLat([avgLon, avgLat]), 5);
                    }
                }

                const escape = (s: string): string => s.replace(/[&<>"']/g, (ch) =>
                    ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', '\'': '&#39;'})[ch] ?? ch);

                for (const e of list) {
                    const when = moment(e.event_time_ms).format('YYYY-MM-DD HH:mm');
                    const depth = e.depth_km === undefined || e.depth_km === null ? '–' : e.depth_km.toFixed(1);
                    const placeCell = e.url
                        ? `<a href="${escape(e.url)}" target="_blank" rel="noopener noreferrer">${escape(e.place)}</a>`
                        : escape(e.place);
                    tbody.append(jQuery<HTMLTableRowElement>(
                        '<tr>' +
                        `<td>${when}</td>` +
                        `<td class="text-right"><b>${e.magnitude.toFixed(1)}</b> ${escape(e.magnitude_type)}</td>` +
                        `<td class="text-right">${depth}</td>` +
                        `<td>${placeCell}</td>` +
                        `<td class="text-right">${e.lat.toFixed(3)}</td>` +
                        `<td class="text-right">${e.lon.toFixed(3)}</td>` +
                        `<td>${escape(e.source)}</td>` +
                        '</tr>'
                    ));
                }
                Lang.i().lAll();
            } finally {
                tableCard.hideLoading();
            }

            await this._refreshImpactForCurrentList();
        };

        // eslint-disable-next-line no-new
        new LeftNavbarLink(this._wrapper.getNavbar().getLeftNavbar(), 'Reload', async() => {
            await this._reload();
            return false;
        }, 'btn btn-block btn-default btn-sm', 'fa fa-redo');

        await this._reload();
    }

    private _readListFilter(): EarthquakeFilter {
        const fromVal = (this._periodFrom?.val() as string) ?? '';
        const toVal = (this._periodTo?.val() as string) ?? '';
        const magVal = (this._minMag?.val() as string) ?? '';
        return {
            period_from: fromVal || undefined,
            period_to: toVal || undefined,
            min_magnitude: magVal ? parseFloat(magVal) : undefined,
            limit: 500,
            offset: 0
        };
    }

    private _readWindowDays(): number {
        const raw = (this._windowSel?.val() as string) ?? '0';
        const wd = parseInt(raw, 10);
        return Number.isFinite(wd) && [0, 1, 3, 7, 14].includes(wd) ? wd : 0;
    }

    private async _reload(): Promise<void> {
        if (this._onLoadTable) {
            await this._onLoadTable();
        }
    }

    /**
     * (Re)load impact for the currently shown event list — called on
     * window-dropdown change and after every table reload. When the
     * window is set to 0 ("keine Sichtungen anzeigen") the impact
     * panel + sighting/movement layers are cleared instead.
     */
    private async _refreshImpactForCurrentList(): Promise<void> {
        const windowDays = this._readWindowDays();
        if (windowDays === 0 || this._currentList.length === 0) {
            this._lastImpactIds = [];
            this._clearImpact();
            return;
        }
        const ids = this._currentList.map((e) => e.id);
        this._lastImpactIds = ids.slice();
        await this._loadImpact({earthquake_ids: ids, window_days: windowDays});
    }

    private async _loadImpact(request: EarthquakeImpactRequest): Promise<void> {
        const lang = Lang.i();
        try {
            const res = await EarthquakeAPI.runImpact(request);
            if (!res || res.statusCode !== StatusCodes.OK) {
                this._toast.fire({icon: 'error', title: res?.msg ?? lang.l('Impact load failed')});
                return;
            }

            const focusIds = (res.earthquakes ?? []).map((e) => e.id);
            if (this._eqLayer) {
                this._eqLayer.setHighlight(focusIds);
                // Re-tag features already buffered + commit.
                if ((res.earthquakes ?? []).length > 0) {
                    this._eqLayer.setEarthquakes(res.earthquakes ?? []);
                }
                this._eqLayer.refresh();
            }

            this._renderSightingMarkers(res.sightings ?? []);
            this._renderMovementTracks(res.tracks ?? []);
            this._renderImpactCard(res.earthquakes ?? [], res.sightings ?? [], res.analytics);
            this._panToImpact(res.earthquakes ?? [], res.sightings ?? []);
        } catch (e) {
            this._toast.fire({icon: 'error', title: (e as Error).message});
        }
    }

    private _renderSightingMarkers(sightings: EarthquakeImpactSighting[]): void {
        if (!this._sightingLayer) {
            return;
        }
        this._sightingLayer.clearFeatures();
        for (const s of sightings) {
            if (!Number.isFinite(s.lat) || !Number.isFinite(s.lon) || (s.lat === 0 && s.lon === 0)) {
                continue;
            }
            const tooltip = `<b>${this._escape(s.species_name || `#${s.species_id}`)}</b><br>` +
                `${s.date} ${s.tour_start}<br>` +
                `${this._escape(s.encounter_name || '—')}<br>` +
                `Δ ${s.distance_km.toFixed(1)} km / ${s.hours_offset > 0 ? '+' : ''}${s.hours_offset.toFixed(1)} h`;
            this._sightingLayer.addSighting(
                SightingMapObjectType.Odontoceti,
                s.id,
                tooltip,
                [s.lon, s.lat]
            );
        }
        this._sightingLayer.refresh();
    }

    private _renderMovementTracks(tracks: EarthquakeImpactTrack[]): void {
        if (!this._movementLayer) {
            return;
        }
        // MovementTracksLayer.setMovements expects {sighting_id, tracks:[...]}.
        this._movementLayer.setMovements(tracks.map((t) => ({
            sighting_id: t.sighting_id,
            tracks: t.tracks.map((seg) => ({
                start_lat: seg.start_lat,
                start_lon: seg.start_lon,
                end_lat: seg.end_lat,
                end_lon: seg.end_lon,
                quality: seg.quality
            }))
        })));
    }

    private _renderImpactCard(
        earthquakes: EarthquakeEntry[],
        sightings: EarthquakeImpactSighting[],
        analytics: EarthquakeImpactAnalytics | undefined
    ): void {
        if (!this._impactCard) {
            return;
        }
        const lang = Lang.i();

        const distinctSightingIds = new Set(sightings.map((s) => s.id)).size;
        const eqLine = earthquakes.length === 1
            ? `${moment(earthquakes[0].event_time_ms).format('YYYY-MM-DD HH:mm')} — M${earthquakes[0].magnitude.toFixed(1)} ${this._escape(earthquakes[0].place)}`
            : `${earthquakes.length} ${lang.l('events')}`;
        const summary = `<strong>${eqLine}</strong><br>` +
            `${lang.l('Window')}: ±${this._readWindowDays()} ${lang.l('days')} | ` +
            `${lang.l('Affected sightings')}: ${distinctSightingIds} | ` +
            `${lang.l('Correlations')}: ${sightings.length}`;
        this._impactSummary?.html(summary);

        if (analytics && this._hostSpecies && this._hostBehaviour && this._hostEncounter && this._hostHours) {
            Earthquake._renderBarChart(this._hostSpecies, analytics.by_species, '#2471A3', false);
            Earthquake._renderBarChart(this._hostBehaviour, analytics.by_behaviour, '#16a085', false);
            Earthquake._renderBarChart(this._hostEncounter, analytics.by_encounter, '#d35400', false);
            Earthquake._renderBarChart(this._hostHours, analytics.hours_offset_hist, '#7f8c8d', true);
        }
        jQuery(this._impactCard.getBodyElement()).show();
    }

    private _panToImpact(earthquakes: EarthquakeEntry[], sightings: EarthquakeImpactSighting[]): void {
        if (!this._map) {
            return;
        }
        const pts: {lat: number; lon: number;}[] = [];
        for (const e of earthquakes) {
            pts.push({lat: e.lat, lon: e.lon});
        }
        for (const s of sightings) {
            if (Number.isFinite(s.lat) && Number.isFinite(s.lon) && !(s.lat === 0 && s.lon === 0)) {
                pts.push({lat: s.lat, lon: s.lon});
            }
        }
        if (pts.length === 0) {
            return;
        }
        const avgLat = pts.reduce((s, p) => s + p.lat, 0) / pts.length;
        const avgLon = pts.reduce((s, p) => s + p.lon, 0) / pts.length;
        // Zoom 6 keeps a few neighbouring islands visible so the user
        // can see where the affected sightings sit relative to the
        // event without dropping into single-coastline detail.
        this._map.setView(fromLonLat([avgLon, avgLat]), 6);
    }

    private _clearImpact(): void {
        if (this._eqLayer) {
            this._eqLayer.setHighlight([]);
            this._eqLayer.refresh();
        }
        if (this._sightingLayer) {
            this._sightingLayer.clearFeatures();
            this._sightingLayer.refresh();
        }
        if (this._movementLayer) {
            this._movementLayer.clear();
        }
        if (this._impactCard) {
            jQuery(this._impactCard.getBodyElement()).hide();
        }
    }

    private _escape(s: string): string {
        return s.replace(/[&<>"']/g, (ch) =>
            ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', '\'': '&#39;'})[ch] ?? ch);
    }

    /**
     * Mini bar chart. Categorical buckets sort highest-first up-stream
     * already; the hours-offset histogram should keep its original
     * (chronological) order to read correctly.
     */
    private static _renderBarChart(host: HTMLElement, buckets: EarthquakeImpactBucket[], color: string, preserveOrder: boolean): void {
        d3.select(host).selectAll('*').remove();
        if (buckets.length === 0) {
            jQuery(host).text(Lang.i().l('No data'));
            return;
        }

        const data = preserveOrder ? buckets.slice() : buckets.slice().sort((a, b) => b.count - a.count).slice(0, 12);

        const width = Math.max(220, (host.clientWidth || 300) - 16);
        const height = 200;
        const margin = {top: 8, right: 8, bottom: 64, left: 36};
        const innerW = width - margin.left - margin.right;
        const innerH = height - margin.top - margin.bottom;

        const svg = d3.select(host).append('svg').attr('width', width).attr('height', height);
        const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

        const labels = data.map((b: EarthquakeImpactBucket) => b.key);
        const x = d3.scaleBand().domain(labels).range([0, innerW]).padding(0.1);
        const yMax = d3.max(data, (b: EarthquakeImpactBucket) => b.count) ?? 1;
        const y = d3.scaleLinear().domain([0, Math.max(1, yMax)]).nice().range([innerH, 0]);

        g.append('g')
            .attr('transform', `translate(0,${innerH})`)
            .call(d3.axisBottom(x))
            .selectAll('text')
            .style('font-size', '10px')
            .attr('transform', 'rotate(-35)')
            .style('text-anchor', 'end');
        g.append('g').call(d3.axisLeft(y).ticks(4)).selectAll('text').style('font-size', '10px');

        g.selectAll('rect')
            .data(data)
            .enter()
            .append('rect')
            .attr('x', (_b: EarthquakeImpactBucket, i: number) => x(labels[i]))
            .attr('width', x.bandwidth())
            .attr('y', (b: EarthquakeImpactBucket) => y(b.count))
            .attr('height', (b: EarthquakeImpactBucket) => innerH - y(b.count))
            .attr('fill', color)
            .append('title')
            .text((b: EarthquakeImpactBucket) => `${b.key}: ${b.count}`);
    }

}