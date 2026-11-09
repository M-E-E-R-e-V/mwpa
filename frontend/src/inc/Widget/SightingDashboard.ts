/* global JQuery */
import {Lang} from '../Lang';
import {ComponentType, UtilColor, Widget2} from 'bambooo';
import crossfilter from 'crossfilter2';
import * as d3 from 'd3';
import * as dc from 'dc';
import {SightingsEntry} from '../Api/Sightings';
import {SpeciesEntry} from '../Api/Species';
import {VehicleEntry} from '../Api/Vehicle';
import {AdminListUi} from './AdminListUi';

/**
 * Lookup maps the dashboard uses to render bar labels (id → display name).
 */
export type SightingDashboardLookups = {
    species: Map<number, SpeciesEntry>;
    vehicles: Map<number, VehicleEntry>;
};

export type SightingDashboardOnFiltered = (filtered: SightingsEntry[]) => void;

/**
 * Crossfilter / dc.js side panel of the sighting map. Summary tiles on top
 * (sightings shown, species, animals, years — always for the current
 * selection), then the filter charts stacked vertically: timeline (brush),
 * species top 10, hour of day (brush) and Beaufort. Selecting on any chart
 * fires `onFiltered` with the surviving entries so the map can be redrawn
 * against the same subset.
 */
export class SightingDashboard extends Widget2 {

    protected static readonly _DAY_MS = 24 * 60 * 60 * 1000;

    protected _lookups: SightingDashboardLookups = {
        species: new Map(),
        vehicles: new Map()
    };

    protected _onFiltered: SightingDashboardOnFiltered | null = null;

    protected _cf: crossfilter.Crossfilter<SightingsEntry> | null = null;

    /**
     * Number of entries in the current dataset
     * @protected
     */
    protected _total: number = 0;

    /**
     * Live chart instances; kept for filterAll() on reset and deregister on clear.
     * dc.js has no bundled types so this is `any[]`.
     */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    protected _charts: any[] = [];

    protected _statusEl: JQuery;

    protected _resetBtn: JQuery;

    protected _statsEl: JQuery;

    protected _chartsEl: JQuery;

    protected _timeChartEl: JQuery;

    protected _speciesChartEl: JQuery;

    protected _hourChartEl: JQuery;

    protected _beaufortChartEl: JQuery;

    public constructor(parent: ComponentType) {
        super({
            element: jQuery('<div class="sighting-dashboard d-flex flex-column gap-3"/>')
        });

        const root = this._element;
        root.appendTo(SightingDashboard._asParent(parent));

        const header = jQuery('<div class="d-flex align-items-center gap-2"/>').appendTo(root);
        this._statusEl = jQuery('<div class="small text-body-secondary flex-grow-1"/>').appendTo(header);
        this._resetBtn = jQuery('<button type="button" class="btn btn-sm btn-outline-secondary text-nowrap"/>').appendTo(header);
        jQuery('<i class="fas fa-undo me-1"/>').appendTo(this._resetBtn);
        jQuery('<span/>').text(Lang.i().l('Reset selection')).appendTo(this._resetBtn);
        this._resetBtn.addClass('d-none');
        this._resetBtn.on('click', () => {
            this.resetFilters();
        });

        this._statsEl = jQuery('<div class="d-grid gap-2" style="grid-template-columns: 1fr 1fr;"/>').appendTo(root);
        this._chartsEl = jQuery('<div class="d-flex flex-column gap-3"/>').appendTo(root);

        this._timeChartEl = this._section('far fa-calendar-alt', 'Timeline', 'drag to select a period');
        this._speciesChartEl = this._section('fas fa-paw', 'Species (top 10)', 'click to select');
        this._hourChartEl = this._section('far fa-clock', 'Time of day', 'drag to select');
        this._beaufortChartEl = this._section('fas fa-wind', 'Beaufort', 'click to select');
    }

    /**
     * Start of the day (UTC ms) of a sighting, 0 when unknown.
     * @param {SightingsEntry} entry
     * @return {number}
     * @protected
     */
    protected static _parseDay(entry: SightingsEntry): number {
        const datePart = (entry.date ?? '').split(' ')[0];
        const t = Date.parse(datePart);

        if (Number.isNaN(t)) {
            return 0;
        }

        return t - (t % SightingDashboard._DAY_MS);
    }

    /**
     * Hour of the sighting (begin of the observation, else tour start), -1 when unknown.
     * @param {SightingsEntry} entry
     * @return {number}
     * @protected
     */
    protected static _parseHour(entry: SightingsEntry): number {
        const ts = entry.duration_from || entry.tour_start || '';
        const m = (/^(\d{1,2}):/u).exec(ts);

        if (!m) {
            return -1;
        }

        return parseInt(m[1], 10);
    }

    /**
     * Row-chart labels in black or white, depending on their bar colour
     * (the species group colours range from pale to dark).
     * @param {unknown} chart dc row chart
     * @protected
     */
    protected static _contrastLabels(chart: unknown): void {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (chart as any).selectAll('g.row').each(function contrastLabel(this: SVGGElement): void {
            const fill = this.querySelector('rect')?.getAttribute('fill') ?? '';
            const text = this.querySelector('text');

            if (text && fill.startsWith('#')) {
                text.style.fill = UtilColor.getContrastYIQ(fill);
            }
        });
    }

    /**
     * Titled panel section; returns the chart slot.
     * @param {string} icon
     * @param {string} title English source text
     * @param {string} hint English source text
     * @return {JQuery}
     * @protected
     */
    protected _section(icon: string, title: string, hint: string): JQuery {
        const lang = Lang.i();
        const section = jQuery('<div class="d-none"/>').appendTo(this._chartsEl);
        const head = jQuery('<div class="d-flex align-items-baseline gap-2 mb-1"/>').appendTo(section);
        jQuery('<i class="text-body-secondary small"/>').addClass(icon).appendTo(head);
        jQuery('<span class="fw-semibold small text-uppercase text-body-secondary"/>').text(lang.l(title)).appendTo(head);
        jQuery('<span class="small text-body-tertiary ms-auto"/>').text(lang.l(hint)).appendTo(head);

        return jQuery('<div class="sighting-dashboard-chart"/>').appendTo(section);
    }

    public setLookups(lookups: SightingDashboardLookups): void {
        this._lookups = lookups;
    }

    public setOnFiltered(cb: SightingDashboardOnFiltered): void {
        this._onFiltered = cb;
    }

    /**
     * Replace the entire dataset and (re)build the charts. Called whenever the
     * server-side filter changes or after the bulk "load all" backfill.
     */
    public setData(sightings: SightingsEntry[]): void {
        this.clear();
        this._total = sightings.length;

        if (sightings.length === 0) {
            this._statusEl.text(Lang.i().l('No sightings under current filter.'));
            this._renderStats([]);
            return;
        }

        this._chartsEl.children().removeClass('d-none');

        const cf = crossfilter<SightingsEntry>(sightings);
        this._cf = cf;

        const sightingsLabel = Lang.i().l('Sightings');

        // Time chart -----------------------------------------------------------------------------
        const days = sightings.map((d) => SightingDashboard._parseDay(d)).filter((t) => t > 0);
        const minDay = days.length > 0 ? Math.min(...days) : Date.now();
        const maxDay = days.length > 0 ? Math.max(...days) : Date.now();
        const dayMs = SightingDashboard._DAY_MS;

        /*
         * Pick the time-bucket granularity from the data span so the bar chart
         * never draws sub-pixel (negative-width) bars. With the manually-entered
         * old data reaching back to the 1990s a daily bucket would be ~11k bars
         * — each bar narrower than the inter-bar gap, which makes the SVG
         * `<rect>` width go negative. Day up to ~1y span, week up to ~5y, month
         * up to ~25y, year beyond.
         */
        const spanDays = (maxDay - minDay) / dayMs;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let xUnits: any = (d3 as any).timeDay;
        let bucketOf: (t: number) => number = (t): number => t;
        let padMs = dayMs;

        if (spanDays > 9000) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            xUnits = (d3 as any).timeYear;
            bucketOf = (t): number => Date.UTC(new Date(t).getUTCFullYear(), 0, 1);
            padMs = 366 * dayMs;
        } else if (spanDays > 1500) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            xUnits = (d3 as any).timeMonth;
            bucketOf = (t): number => {
                const d = new Date(t);
                return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1);
            };
            padMs = 31 * dayMs;
        } else if (spanDays > 370) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            xUnits = (d3 as any).timeWeek;
            bucketOf = (t): number => t - (t % (7 * dayMs));
            padMs = 7 * dayMs;
        }

        const dayDim = cf.dimension((d) => bucketOf(SightingDashboard._parseDay(d)));
        const dayGroup = dayDim.group();

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const timeChart = (dc as any).barChart(this._timeChartEl[0]);
        timeChart
        .width(this._approxWidth(this._timeChartEl, 340))
        .height(120)
        .margins({top: 8, right: 10, bottom: 24, left: 36})
        .dimension(dayDim)
        .group(dayGroup)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .x((d3 as any).scaleTime().domain([new Date(minDay - padMs), new Date(maxDay + padMs)]))
        .xUnits(xUnits)
        .elasticY(true)
        .brushOn(true)
        .renderHorizontalGridLines(true)
        .ordinalColors(['#2f6fb5'])
        .title((d: {key: number; value: number;}): string => {
            const date = new Date(d.key);
            return `${date.toISOString().slice(0, 10)}: ${d.value} ${sightingsLabel}`;
        });
        timeChart.yAxis().ticks(3);
        timeChart.xAxis().ticks(4);
        this._charts.push(timeChart);

        // Species chart (top-N row chart, bars in the species group colour) ----------------------
        const speciesDim = cf.dimension((d) => d.species_id ?? 0);
        const speciesGroup = speciesDim.group();
        const speciesLookup = this._lookups.species;
        const noSpecies = Lang.i().l('(no species)');

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const speciesChart = (dc as any).rowChart(this._speciesChartEl[0]);
        speciesChart
        .width(this._approxWidth(this._speciesChartEl, 340))
        .height(250)
        .margins({top: 0, right: 10, bottom: 24, left: 6})
        .gap(3)
        .dimension(speciesDim)
        .group(speciesGroup)
        .elasticX(true)
        .cap(10)
        .othersGrouper(null)
        .colorAccessor((d: {key: number;}): number => d.key)
        .colors((key: number): string => speciesLookup.get(key)?.species_group?.color || '#8a99a8')
        .label((d: {key: number; value: number;}): string => {
            if (d.key === 0) {
                return `${noSpecies} — ${d.value}`;
            }

            const s = speciesLookup.get(d.key);
            const name = s ? s.name.split(',')[0] : `#${d.key}`;
            return `${name} — ${d.value}`;
        })
        .title((d: {key: number; value: number;}): string => `${d.value} ${sightingsLabel}`);
        speciesChart.xAxis().ticks(4);
        speciesChart.on('renderlet.labels', SightingDashboard._contrastLabels);
        this._charts.push(speciesChart);

        // Hour-of-day chart ----------------------------------------------------------------------
        const hourDim = cf.dimension((d) => SightingDashboard._parseHour(d));
        const hourGroup = hourDim.group();
        const noTime = Lang.i().l('(no time)');

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const hourChart = (dc as any).barChart(this._hourChartEl[0]);
        hourChart
        .width(this._approxWidth(this._hourChartEl, 340))
        .height(120)
        .margins({top: 8, right: 10, bottom: 24, left: 36})
        .dimension(hourDim)
        .group(hourGroup)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .x((d3 as any).scaleLinear().domain([0, 24]))
        .xUnits(() => 24)
        .elasticY(true)
        .brushOn(true)
        .ordinalColors(['#2e8b57'])
        .title((d: {key: number; value: number;}): string => {
            if (d.key === -1) {
                return `${noTime} — ${d.value}`;
            }

            return `${d.key.toString().padStart(2, '0')}:00 — ${d.value} ${sightingsLabel}`;
        });
        hourChart.yAxis().ticks(3);
        hourChart.xAxis().ticks(6).tickFormat((h: number): string => `${h}h`);
        this._charts.push(hourChart);

        // Beaufort wind chart --------------------------------------------------------------------
        const beaufortDim = cf.dimension((d) => {
            const b = (d.beaufort_wind ?? '').trim();
            return b === '' ? '?' : b;
        });
        const beaufortGroup = beaufortDim.group();

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const beaufortChart = (dc as any).rowChart(this._beaufortChartEl[0]);
        beaufortChart
        .width(this._approxWidth(this._beaufortChartEl, 340))
        .height(Math.min(220, 30 + (beaufortGroup.size() * 22)))
        .margins({top: 0, right: 10, bottom: 24, left: 6})
        .gap(3)
        .dimension(beaufortDim)
        .group(beaufortGroup)
        .elasticX(true)
        .ordinalColors(['#5b8fc7'])
        .ordering((d: {key: string; value: number;}): string => d.key)
        .label((d: {key: string; value: number;}): string => `Beaufort ${AdminListUi.escape(d.key)} — ${d.value}`)
        .title((d: {key: string; value: number;}): string => `${d.value} ${sightingsLabel}`);
        beaufortChart.xAxis().ticks(3);
        this._charts.push(beaufortChart);

        // Wire onFiltered hook (debounced one tick, so multi-chart filterAll batches) ------------
        let pending: ReturnType<typeof setTimeout> | null = null;
        const fire = (): void => {
            if (pending !== null) {
                clearTimeout(pending);
            }

            pending = setTimeout(() => {
                pending = null;

                if (!this._cf) {
                    return;
                }

                const filtered = this._cf.allFiltered();
                this._renderStats(filtered);

                if (this._onFiltered) {
                    this._onFiltered(filtered);
                }
            }, 50);
        };

        for (const c of this._charts) {
            c.on('filtered.dashboard', fire);
        }

        this._renderStats(sightings);

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (dc as any).renderAll();
    }

    /**
     * Summary tiles + status line for the current selection.
     * @param {SightingsEntry[]} shown
     * @protected
     */
    protected _renderStats(shown: SightingsEntry[]): void {
        const lang = Lang.i();
        const species = new Set<number>();
        const years = new Set<number>();
        let animals = 0;

        for (const entry of shown) {
            if ((entry.species_id ?? 0) > 0) {
                species.add(entry.species_id!);
            }

            animals += entry.species_count ?? 0;

            const day = SightingDashboard._parseDay(entry);

            if (day > 0) {
                years.add(new Date(day).getUTCFullYear());
            }
        }

        const filtered = shown.length < this._total;
        const yearList = [...years].sort((a, b) => a - b);
        let period = '—';

        if (yearList.length === 1) {
            period = `${yearList[0]}`;
        } else if (yearList.length > 1) {
            period = `${yearList[0]}–${yearList[yearList.length - 1]}`;
        }

        this._statsEl.empty();
        AdminListUi.stat(
            this._statsEl,
            'fas fa-map-marker-alt',
            filtered ? `${shown.length.toLocaleString()} / ${this._total.toLocaleString()}` : shown.length.toLocaleString(),
            'Sightings',
            'text-primary'
        );
        AdminListUi.stat(this._statsEl, 'fas fa-paw', `${species.size}`, 'Species', 'text-success');
        AdminListUi.stat(this._statsEl, 'fas fa-users', animals.toLocaleString(), 'Animals', 'text-warning');
        AdminListUi.stat(this._statsEl, 'far fa-calendar-alt', period, 'Period');

        this._statusEl.text(filtered
            ? lang.l('Selection active — the map only shows the selected sightings.')
            : lang.l('Select in the charts to filter the map.'));
        this._resetBtn.toggleClass('d-none', !filtered);
    }

    /**
     * Reset every chart's filter without rebuilding. Fires onFiltered once at the end.
     */
    public resetFilters(): void {
        for (const c of this._charts) {
            c.filterAll();
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (dc as any).redrawAll();

        if (this._cf) {
            const all = this._cf.allFiltered();
            this._renderStats(all);

            if (this._onFiltered) {
                this._onFiltered(all);
            }
        }
    }

    /**
     * Drop charts and crossfilter state. Safe to call before setData() or twice in a row.
     */
    public clear(): void {
        for (const c of this._charts) {
            try {
                c.on('filtered.dashboard', null);
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                (dc as any).deregisterChart(c);
            } catch {
                // dc throws if already deregistered — ignore
            }
        }

        this._charts = [];
        this._cf = null;
        this._total = 0;

        this._timeChartEl.empty();
        this._speciesChartEl.empty();
        this._hourChartEl.empty();
        this._beaufortChartEl.empty();
        this._chartsEl.children().addClass('d-none');

        this._statsEl.empty();
        this._statusEl.text('');
        this._resetBtn.addClass('d-none');
    }

    /**
     * Width helper. The chart slots can be invisible at construction time
     * (Map tab is hidden), in which case .width() returns 0 — fall back to
     * the supplied default so dc draws something on first render.
     */
    protected _approxWidth(el: JQuery, fallback: number): number {
        const w = el.width() || 0;
        return w > 0 ? w : fallback;
    }

    /**
     * Resolve a parent (bambooo component, jQuery or selector) to a jQuery
     * handle the widget root can be appended to.
     * @param {ComponentType} element
     * @return {JQuery}
     * @protected
     */
    protected static _asParent(element: ComponentType): JQuery {
        const maybe = element as {getElement?: () => JQuery;} | null | undefined;

        if (maybe && typeof maybe.getElement === 'function') {
            return maybe.getElement();
        }

        return jQuery(element as JQuery.Selector);
    }

}