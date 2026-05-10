/* global JQuery */
import {Component} from 'bambooo';
import crossfilter from 'crossfilter2';
import * as d3 from 'd3';
import * as dc from 'dc';
import {SightingsEntry} from '../Api/Sightings';
import {SpeciesEntry} from '../Api/Species';
import {VehicleEntry} from '../Api/Vehicle';

const DAY_MS = 24 * 60 * 60 * 1000;

const escapeHtml = (s: string): string => s
.replace(/&/gu, '&amp;')
.replace(/</gu, '&lt;')
.replace(/>/gu, '&gt;')
.replace(/"/gu, '&quot;')
.replace(/'/gu, '&#39;');

/**
 * Resolve dimensions on the SightingsEntry. `parseDay` truncates to the day in
 * UTC ms; `parseHour` pulls the hour out of the `HH:mm:ss` tour-start string.
 */
const parseDay = (entry: SightingsEntry): number => {
    const datePart = (entry.date ?? '').split(' ')[0];
    const t = Date.parse(datePart);

    if (Number.isNaN(t)) {
        return 0;
    }

    return t - (t % DAY_MS);
};

const parseHour = (entry: SightingsEntry): number => {
    const ts = entry.tour_start ?? '';
    const m = (/^(\d{1,2}):/u).exec(ts);

    if (!m) {
        return -1;
    }

    return parseInt(m[1], 10);
};

/**
 * Lookup maps the dashboard uses to render bar labels (id → display name).
 */
export type SightingDashboardLookups = {
    species: Map<number, SpeciesEntry>;
    vehicles: Map<number, VehicleEntry>;
};

export type SightingDashboardOnFiltered = (filtered: SightingsEntry[]) => void;

/**
 * Crossfilter / dc.js dashboard sitting above the SightingMap. Charts share a
 * single crossfilter instance over the currently loaded sightings; selecting on
 * any chart fires `onFiltered` with the surviving entries so the map can be
 * redrawn against the same subset.
 */
export class SightingDashboard extends Component<HTMLDivElement> {

    protected _lookups: SightingDashboardLookups = {
        species: new Map(),
        vehicles: new Map()
    };

    protected _onFiltered: SightingDashboardOnFiltered | null = null;

    protected _cf: crossfilter.Crossfilter<SightingsEntry> | null = null;

    /**
     * Live chart instances; kept for filterAll() on reset and deregister on clear.
     * dc.js has no bundled types so this is `any[]`.
     */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    protected _charts: any[] = [];

    protected _statusEl: JQuery;

    protected _resetBtn: JQuery;

    protected _timeChartEl: JQuery;

    protected _speciesChartEl: JQuery;

    protected _hourChartEl: JQuery;

    protected _beaufortChartEl: JQuery;

    public constructor(parent: JQuery) {
        const root = jQuery<HTMLDivElement>('<div class="sighting-dashboard mb-2"/>').appendTo(parent);
        super(root);

        const header = jQuery('<div class="sighting-dashboard-header"/>').appendTo(root);
        this._statusEl = jQuery('<span class="sighting-dashboard-status"/>').appendTo(header);
        this._resetBtn = jQuery('<button type="button" class="btn btn-default btn-xs">Reset filters</button>').appendTo(header);
        this._resetBtn.prop('disabled', true);
        this._resetBtn.on('click', () => {
            this.resetFilters();
        });

        this._timeChartEl = jQuery('<div class="sighting-dashboard-chart sighting-dashboard-time"/>').appendTo(root);

        const row = jQuery('<div class="sighting-dashboard-row"/>').appendTo(root);
        this._speciesChartEl = jQuery('<div class="sighting-dashboard-chart sighting-dashboard-species"/>').appendTo(row);
        this._hourChartEl = jQuery('<div class="sighting-dashboard-chart sighting-dashboard-hour"/>').appendTo(row);
        this._beaufortChartEl = jQuery('<div class="sighting-dashboard-chart sighting-dashboard-beaufort"/>').appendTo(row);
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

        if (sightings.length === 0) {
            this._statusEl.text('No sightings under current filter.');
            this._resetBtn.prop('disabled', true);
            return;
        }

        this._statusEl.text(`${sightings.length} sightings — drag on the time bar or click categories to filter the map.`);
        this._resetBtn.prop('disabled', false);

        const cf = crossfilter<SightingsEntry>(sightings);
        this._cf = cf;

        // Time chart -----------------------------------------------------------------------------
        const dayDim = cf.dimension((d) => parseDay(d));
        const dayGroup = dayDim.group();

        const days = sightings.map((d) => parseDay(d)).filter((t) => t > 0);
        const minDay = days.length > 0 ? Math.min(...days) : Date.now();
        const maxDay = days.length > 0 ? Math.max(...days) : Date.now();

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const timeChart = (dc as any).barChart(this._timeChartEl[0]);
        timeChart
        .width(this._approxWidth(this._timeChartEl, 800))
        .height(140)
        .margins({top: 10, right: 25, bottom: 28, left: 40})
        .dimension(dayDim)
        .group(dayGroup)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .x((d3 as any).scaleTime().domain([new Date(minDay - DAY_MS), new Date(maxDay + DAY_MS)]))
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .xUnits((d3 as any).timeDay)
        .elasticY(true)
        .brushOn(true)
        .renderHorizontalGridLines(true)
        .yAxisLabel('Sightings')
        .title((d: {key: number; value: number;}): string => {
            const date = new Date(d.key);
            return `${date.toISOString().slice(0, 10)}: ${d.value}`;
        });
        timeChart.yAxis().ticks(4);
        this._charts.push(timeChart);

        // Species chart (top-N row chart) --------------------------------------------------------
        const speciesDim = cf.dimension((d) => d.species_id ?? 0);
        const speciesGroup = speciesDim.group();
        const speciesLookup = this._lookups.species;

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const speciesChart = (dc as any).rowChart(this._speciesChartEl[0]);
        speciesChart
        .width(this._approxWidth(this._speciesChartEl, 320))
        .height(220)
        .margins({top: 10, right: 10, bottom: 28, left: 10})
        .dimension(speciesDim)
        .group(speciesGroup)
        .elasticX(true)
        .cap(10)
        .othersGrouper(null)
        .label((d: {key: number; value: number;}): string => {
            if (d.key === 0) {
                return `(no species) — ${d.value}`;
            }

            const s = speciesLookup.get(d.key);
            const name = s ? s.name.split(',')[0] : `#${d.key}`;
            return `${name} — ${d.value}`;
        })
        .title((d: {key: number; value: number;}): string => `${d.value} sightings`);
        speciesChart.xAxis().ticks(4);
        this._charts.push(speciesChart);

        // Hour-of-day chart ----------------------------------------------------------------------
        const hourDim = cf.dimension((d) => parseHour(d));
        const hourGroup = hourDim.group();

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const hourChart = (dc as any).barChart(this._hourChartEl[0]);
        hourChart
        .width(this._approxWidth(this._hourChartEl, 320))
        .height(220)
        .margins({top: 10, right: 15, bottom: 28, left: 35})
        .dimension(hourDim)
        .group(hourGroup)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .x((d3 as any).scaleLinear().domain([-1, 24]))
        .xUnits(() => 25)
        .elasticY(true)
        .brushOn(true)
        .yAxisLabel('Sightings')
        .xAxisLabel('Hour of day')
        .title((d: {key: number; value: number;}): string => {
            if (d.key === -1) {
                return `(no time) — ${d.value}`;
            }

            return `${d.key.toString().padStart(2, '0')}:00 — ${d.value}`;
        });
        hourChart.yAxis().ticks(4);
        hourChart.xAxis().ticks(8);
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
        .width(this._approxWidth(this._beaufortChartEl, 320))
        .height(220)
        .margins({top: 10, right: 10, bottom: 28, left: 10})
        .dimension(beaufortDim)
        .group(beaufortGroup)
        .elasticX(true)
        .ordering((d: {key: string; value: number;}): string => d.key)
        .label((d: {key: string; value: number;}): string => `Beaufort ${escapeHtml(d.key)} — ${d.value}`)
        .title((d: {key: string; value: number;}): string => `${d.value} sightings`);
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

                if (this._onFiltered && this._cf) {
                    this._onFiltered(this._cf.allFiltered());
                }
            }, 50);
        };

        for (const c of this._charts) {
            c.on('filtered.dashboard', fire);
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (dc as any).renderAll();
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

        if (this._onFiltered && this._cf) {
            this._onFiltered(this._cf.allFiltered());
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

        this._timeChartEl.empty();
        this._speciesChartEl.empty();
        this._hourChartEl.empty();
        this._beaufortChartEl.empty();

        this._statusEl.text('');
        this._resetBtn.prop('disabled', true);
    }

    /**
     * Width helper. The chart slots can be invisible at construction time
     * (Map tab is hidden), in which case .width() returns 0 — fall back to
     * the supplied default so dc draws something on first render.
     */
    protected _approxWidth(el: JQuery, fallback: number): number {
        const w = el.width() ?? 0;
        return w > 0 ? w : fallback;
    }

}