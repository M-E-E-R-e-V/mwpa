/* global JQuery */
import {Component} from 'bambooo';
import * as d3raw from 'd3';
import {SightingEnvironmentEntry} from '../../Api/SightingEnvironment';

/*
 * d3 ships its own typings via `@types/d3` packages — not installed in
 * this project. Mirrors the pattern in SightingAnalytics.ts: cast the
 * namespace to `any` once and let the chart code stay readable.
 */
const d3: any = d3raw;

const escapeHtml = (s: string): string => s
.replace(/&/gu, '&amp;')
.replace(/</gu, '&lt;')
.replace(/>/gu, '&gt;');

/**
 * Selects the metric value from one row. Undefined values get filtered
 * out before plotting.
 */
export type MetricAccessor = (e: SightingEnvironmentEntry) => number | undefined;

type ChartDef = {
    title: string;
    accessor: MetricAccessor;
    unit: string;
};

type ScatterPair = {chl: number; fish: number;};
type SeriesPoint = {date: Date; mean: number;};

/**
 * Three-up analytics panel for the OceanFishingMap:
 *
 *   - **Histogram** of the primary metric (default chlorophyll-a)
 *     showing the distribution of values across the filtered set.
 *   - **Scatter** of fishing-hours vs chlorophyll-a — visualises how
 *     productivity and fishing pressure overlap on the same points.
 *   - **Time series** of monthly means for the primary metric, useful
 *     for seasonality once enough months are loaded.
 *
 * Plain d3 (no dc.js); a few thousand rows is well within "redraw on
 * every setData" territory.
 */
export class MetricCharts extends Component<HTMLDivElement> {

    /**
     * @protected
     */
    protected _statusEl: JQuery;

    /**
     * @protected
     */
    protected _histEl: JQuery;

    /**
     * @protected
     */
    protected _scatterEl: JQuery;

    /**
     * @protected
     */
    protected _seriesEl: JQuery;

    /**
     * @protected
     */
    protected _primary: ChartDef = {
        title: 'Chlorophyll-a (mg/m³)',
        accessor: (e): number | undefined => e.chl_a_mg_m3_day,
        unit: 'mg/m³'
    };

    public constructor(parent: JQuery) {
        const root = jQuery<HTMLDivElement>('<div class="metric-charts"/>').appendTo(parent);
        super(root);

        this._statusEl = jQuery('<div class="metric-charts-status" style="padding:6px 8px;color:#555;"/>').appendTo(root);

        const grid = jQuery('<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(320px,1fr));gap:12px;padding:8px;"/>').appendTo(root);
        this._histEl = MetricCharts._chartCard(grid, 'Distribution');
        this._scatterEl = MetricCharts._chartCard(grid, 'Chl-a vs Fishing effort');
        this._seriesEl = MetricCharts._chartCard(grid, 'Monthly mean');
    }

    /**
     * Choose which metric the histogram + time-series chart against.
     * The scatter stays as chl-a vs fishing-hours regardless.
     */
    public setPrimaryMetric(def: ChartDef): void {
        this._primary = def;
    }

    public setData(rows: SightingEnvironmentEntry[]): void {
        this._histEl.empty();
        this._scatterEl.empty();
        this._seriesEl.empty();

        if (rows.length === 0) {
            this._statusEl.text('No sightings under current filter.');
            return;
        }

        this._statusEl.text(`${rows.length} sightings analysed.`);

        this._renderHistogram(rows);
        this._renderScatter(rows);
        this._renderTimeSeries(rows);
    }

    /**
     * @protected
     */
    protected static _chartCard(grid: JQuery, title: string): JQuery {
        const card = jQuery('<div style="background:#fff;border:1px solid #dee2e6;border-radius:4px;padding:6px;"/>').appendTo(grid);
        jQuery(`<div style="font-weight:600;margin-bottom:4px;font-size:0.85rem;">${escapeHtml(title)}</div>`).appendTo(card);
        return jQuery('<div style="height:200px;"/>').appendTo(card);
    }

    /**
     * @protected
     */
    protected _renderHistogram(rows: SightingEnvironmentEntry[]): void {
        const values: number[] = [];
        for (const r of rows) {
            const v = this._primary.accessor(r);
            if (typeof v === 'number' && Number.isFinite(v)) {
                values.push(v);
            }
        }

        if (values.length === 0) {
            jQuery(`<div style="color:#888;">No values for ${escapeHtml(this._primary.title)} yet.</div>`).appendTo(this._histEl);
            return;
        }

        const containerWidth = this._histEl.width() ?? 320;
        const containerHeight = this._histEl.height() ?? 200;
        const margin = {top: 6, right: 10, bottom: 26, left: 36};
        const width = containerWidth - margin.left - margin.right;
        const height = containerHeight - margin.top - margin.bottom;

        const svg = d3.select(this._histEl[0])
        .append('svg')
        .attr('width', containerWidth)
        .attr('height', containerHeight);

        const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

        const xDomain = d3.extent(values);
        const x = d3.scaleLinear().domain(xDomain).nice().range([0, width]);

        const bins = d3.bin().domain(x.domain()).thresholds(20)(values);
        const yMax = d3.max(bins, (b: any): number => b.length) ?? 1;
        const y = d3.scaleLinear().domain([0, yMax]).nice().range([height, 0]);

        g.selectAll('rect')
        .data(bins)
        .enter()
        .append('rect')
        .attr('x', (d: any): number => x(d.x0 ?? 0) + 1)
        .attr('y', (d: any): number => y(d.length))
        .attr('width', (d: any): number => Math.max(0, x(d.x1 ?? 0) - x(d.x0 ?? 0) - 1))
        .attr('height', (d: any): number => height - y(d.length))
        .attr('fill', '#69b3a2');

        g.append('g').attr('transform', `translate(0,${height})`).call(d3.axisBottom(x).ticks(5));
        g.append('g').call(d3.axisLeft(y).ticks(4));
    }

    /**
     * @protected
     */
    protected _renderScatter(rows: SightingEnvironmentEntry[]): void {
        const pairs: ScatterPair[] = [];
        for (const r of rows) {
            const chl = r.chl_a_mg_m3_day;
            const fish = r.fishing_hours_day_25km;
            if (typeof chl === 'number' && Number.isFinite(chl) && typeof fish === 'number' && Number.isFinite(fish)) {
                pairs.push({chl, fish});
            }
        }

        if (pairs.length === 0) {
            jQuery('<div style="color:#888;">No paired chl-a + fishing values yet.</div>').appendTo(this._scatterEl);
            return;
        }

        const containerWidth = this._scatterEl.width() ?? 320;
        const containerHeight = this._scatterEl.height() ?? 200;
        const margin = {top: 6, right: 10, bottom: 26, left: 36};
        const width = containerWidth - margin.left - margin.right;
        const height = containerHeight - margin.top - margin.bottom;

        const svg = d3.select(this._scatterEl[0])
        .append('svg')
        .attr('width', containerWidth)
        .attr('height', containerHeight);

        const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

        const x = d3.scaleLinear().domain(d3.extent(pairs, (p: ScatterPair): number => p.chl)).nice().range([0, width]);
        const y = d3.scaleLinear().domain(d3.extent(pairs, (p: ScatterPair): number => p.fish)).nice().range([height, 0]);

        g.selectAll('circle')
        .data(pairs)
        .enter()
        .append('circle')
        .attr('cx', (d: ScatterPair): number => x(d.chl))
        .attr('cy', (d: ScatterPair): number => y(d.fish))
        .attr('r', 3)
        .attr('fill', 'rgba(220, 100, 50, 0.65)')
        .attr('stroke', 'rgba(0,0,0,0.4)');

        g.append('g').attr('transform', `translate(0,${height})`).call(d3.axisBottom(x).ticks(5));
        g.append('g').call(d3.axisLeft(y).ticks(4));
    }

    /**
     * @protected
     */
    protected _renderTimeSeries(rows: SightingEnvironmentEntry[]): void {
        const monthly = new Map<string, number[]>();

        for (const r of rows) {
            const value = this._primary.accessor(r);
            if (typeof value === 'number' && Number.isFinite(value)) {
                const datePart = (r.date ?? '').split(' ')[0];
                if (datePart.length >= 7) {
                    const monthKey = datePart.slice(0, 7);
                    const bucket = monthly.get(monthKey);
                    if (bucket) {
                        bucket.push(value);
                    } else {
                        monthly.set(monthKey, [value]);
                    }
                }
            }
        }

        if (monthly.size === 0) {
            jQuery('<div style="color:#888;">No dated values yet.</div>').appendTo(this._seriesEl);
            return;
        }

        const points: SeriesPoint[] = Array.from(monthly.entries())
        .map(([k, vs]): SeriesPoint => ({
            date: new Date(`${k}-15T00:00:00Z`),
            mean: vs.reduce((a, b) => a + b, 0) / vs.length
        }))
        .sort((a, b) => a.date.getTime() - b.date.getTime());

        const containerWidth = this._seriesEl.width() ?? 320;
        const containerHeight = this._seriesEl.height() ?? 200;
        const margin = {top: 6, right: 10, bottom: 26, left: 36};
        const width = containerWidth - margin.left - margin.right;
        const height = containerHeight - margin.top - margin.bottom;

        const svg = d3.select(this._seriesEl[0])
        .append('svg')
        .attr('width', containerWidth)
        .attr('height', containerHeight);

        const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

        const x = d3.scaleTime().domain(d3.extent(points, (p: SeriesPoint): Date => p.date)).range([0, width]);
        const yMax = d3.max(points, (p: SeriesPoint): number => p.mean) ?? 1;
        const y = d3.scaleLinear().domain([0, yMax]).nice().range([height, 0]);

        const line = d3.line()
        .x((d: SeriesPoint): number => x(d.date))
        .y((d: SeriesPoint): number => y(d.mean));

        g.append('path')
        .datum(points)
        .attr('fill', 'none')
        .attr('stroke', '#2c7fb8')
        .attr('stroke-width', 1.5)
        .attr('d', line);

        g.selectAll('circle')
        .data(points)
        .enter()
        .append('circle')
        .attr('cx', (d: SeriesPoint): number => x(d.date))
        .attr('cy', (d: SeriesPoint): number => y(d.mean))
        .attr('r', 2.5)
        .attr('fill', '#2c7fb8');

        g.append('g').attr('transform', `translate(0,${height})`).call(d3.axisBottom(x).ticks(4));
        g.append('g').call(d3.axisLeft(y).ticks(4));
    }

}