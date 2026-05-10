/* global JQuery */
import {Component} from 'bambooo';
import * as d3 from 'd3';
import {SightingsEntry} from '../Api/Sightings';
import {SpeciesEntry} from '../Api/Species';
import {Lang} from '../Lang';

const DOW_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const escapeHtml = (s: string): string => s
.replace(/&/gu, '&amp;')
.replace(/</gu, '&lt;')
.replace(/>/gu, '&gt;');

const parseDate = (entry: SightingsEntry): Date | null => {
    const datePart = (entry.date ?? '').split(' ')[0];
    const t = Date.parse(datePart);
    return Number.isNaN(t) ? null : new Date(t);
};

const parseHour = (entry: SightingsEntry): number => {
    const ts = entry.tour_start ?? '';
    const m = (/^(\d{1,2}):/u).exec(ts);
    return m ? parseInt(m[1], 10) : -1;
};

export type SightingAnalyticsLookups = {
    species: Map<number, SpeciesEntry>;
};

/**
 * d3-only analytics dashboard for the sighting list. Four charts side-by-side
 * over the same dataset:
 *  - Donut: top-10 species by sighting count (rest grouped as "Other")
 *  - Bar:   sightings per month-of-year (across the whole loaded range)
 *  - Heatmap: weekday × hour-of-day intensity grid
 *  - Histogram: group-size distribution (species_count buckets)
 *
 * Re-renders fully on every setData() — cheap enough for the typical
 * dataset size (a few thousand sightings) and avoids the diff-rendering
 * complexity that comes with d3 enter/update/exit chains.
 */
export class SightingAnalytics extends Component<HTMLDivElement> {

    protected _lookups: SightingAnalyticsLookups = {species: new Map()};

    protected _statusEl: JQuery;

    protected _donutEl: JQuery;

    protected _monthEl: JQuery;

    protected _heatEl: JQuery;

    protected _histEl: JQuery;

    public constructor(parent: JQuery) {
        const root = jQuery<HTMLDivElement>('<div class="sighting-analytics"/>').appendTo(parent);
        super(root);

        this._statusEl = jQuery('<div class="sighting-analytics-status"/>').appendTo(root);

        const grid = jQuery('<div class="sighting-analytics-grid"/>').appendTo(root);

        const lang = Lang.i();
        this._donutEl = this._chartCard(grid, lang.l('Species (Top 10)'));
        this._monthEl = this._chartCard(grid, lang.l('Sightings per month'));
        this._heatEl = this._chartCard(grid, lang.l('Weekday × hour-of-day'));
        this._histEl = this._chartCard(grid, lang.l('Group size distribution'));
    }

    public setLookups(lookups: SightingAnalyticsLookups): void {
        this._lookups = lookups;
    }

    public setData(sightings: SightingsEntry[]): void {
        this.clear();

        if (sightings.length === 0) {
            this._statusEl.text(Lang.i().l('No sightings under current filter.'));
            return;
        }

        this._statusEl.text(`${sightings.length} ${Lang.i().l('sightings analysed.')}`);

        this._renderDonut(sightings);
        this._renderMonthlyBar(sightings);
        this._renderHeatmap(sightings);
        this._renderHistogram(sightings);
    }

    public clear(): void {
        this._donutEl.empty();
        this._monthEl.empty();
        this._heatEl.empty();
        this._histEl.empty();
        this._statusEl.text('');
    }

    /**
     * Builds one card slot with header + body, returns the body for chart rendering.
     */
    protected _chartCard(grid: JQuery, title: string): JQuery {
        const card = jQuery('<div class="sighting-analytics-card"/>').appendTo(grid);
        jQuery(`<div class="sighting-analytics-title">${escapeHtml(title)}</div>`).appendTo(card);
        return jQuery('<div class="sighting-analytics-body"/>').appendTo(card);
    }

    protected _renderDonut(sightings: SightingsEntry[]): void {
        const counts = new Map<number, number>();
        for (const s of sightings) {
            const id = s.species_id ?? 0;
            counts.set(id, (counts.get(id) ?? 0) + 1);
        }

        const sorted = Array.from(counts.entries())
        .map(([id, value]) => ({id, value}))
        .sort((a, b) => b.value - a.value);

        const top = sorted.slice(0, 10);
        const rest = sorted.slice(10).reduce((acc, x) => acc + x.value, 0);

        type Slice = {label: string; value: number;};

        const data: Slice[] = top.map((x) => {
            let label = '(no species)';
            if (x.id !== 0) {
                label = this._lookups.species.get(x.id)?.name.split(',')[0] ?? `#${x.id}`;
            }
            return {label, value: x.value};
        });

        if (rest > 0) {
            data.push({label: 'Other', value: rest});
        }

        const width = this._donutEl.width() ?? 320;
        const height = 240;
        const radius = (Math.min(width, height) / 2) - 10;

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const svg = (d3 as any).select(this._donutEl[0])
        .append('svg')
        .attr('width', width)
        .attr('height', height);

        const g = svg.append('g').attr('transform', `translate(${(width / 2) - 80},${height / 2})`);

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const color = (d3 as any).scaleOrdinal((d3 as any).schemeTableau10);

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const pie = (d3 as any).pie().sort(null).value((d: Slice) => d.value);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const arc = (d3 as any).arc().innerRadius(radius * 0.55).outerRadius(radius);

        const arcs = g.selectAll('path').data(pie(data)).enter().append('g');

        arcs.append('path')
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .attr('d', arc)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .attr('fill', (_d: any, i: number) => color(`${i}`))
        .attr('stroke', '#fff')
        .attr('stroke-width', 1)
        .append('title')
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .text((d: any) => `${d.data.label}: ${d.data.value}`);

        // Legend (right of donut) ----------------------------------------------------------------
        const legend = svg.append('g').attr('transform', `translate(${width - 160},20)`);
        const legendItem = legend.selectAll('g').data(data).enter().append('g')
        .attr('transform', (_d: Slice, i: number) => `translate(0,${i * 16})`);
        legendItem.append('rect')
        .attr('width', 10).attr('height', 10)
        .attr('fill', (_d: Slice, i: number) => color(`${i}`));
        legendItem.append('text')
        .attr('x', 14).attr('y', 9).attr('font-size', 11)
        .text((d: Slice) => `${d.label} (${d.value})`);
    }

    protected _renderMonthlyBar(sightings: SightingsEntry[]): void {
        const buckets = new Map<string, number>();

        for (const s of sightings) {
            const d = parseDate(s);
            if (d) {
                const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
                buckets.set(key, (buckets.get(key) ?? 0) + 1);
            }
        }

        const data = Array.from(buckets.entries())
        .map(([key, value]) => ({key, value}))
        .sort((a, b) => a.key.localeCompare(b.key));

        if (data.length === 0) {
            return;
        }

        const width = this._monthEl.width() ?? 320;
        const height = 240;
        const margin = {top: 10, right: 10, bottom: 50, left: 35};
        const innerW = width - margin.left - margin.right;
        const innerH = height - margin.top - margin.bottom;

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const svg = (d3 as any).select(this._monthEl[0])
        .append('svg').attr('width', width).attr('height', height);
        const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const x = (d3 as any).scaleBand().domain(data.map((d) => d.key)).range([0, innerW]).padding(0.15);
        const yMax = Math.max(1, ...data.map((d) => d.value));
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const y = (d3 as any).scaleLinear().domain([0, yMax]).nice().range([innerH, 0]);

        g.append('g').attr('transform', `translate(0,${innerH})`)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .call((d3 as any).axisBottom(x).tickValues(x.domain().filter((_d: string, i: number) => i % Math.max(1, Math.ceil(data.length / 12)) === 0)))
        .selectAll('text')
        .attr('transform', 'rotate(-45)')
        .attr('text-anchor', 'end')
        .attr('font-size', 10);

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        g.append('g').call((d3 as any).axisLeft(y).ticks(4)).selectAll('text').attr('font-size', 10);

        g.selectAll('rect').data(data).enter().append('rect')
        .attr('x', (d: {key: string; value: number;}) => x(d.key))
        .attr('y', (d: {key: string; value: number;}) => y(d.value))
        .attr('width', x.bandwidth())
        .attr('height', (d: {key: string; value: number;}) => innerH - y(d.value))
        .attr('fill', '#4682b4')
        .append('title')
        .text((d: {key: string; value: number;}) => `${d.key}: ${d.value}`);
    }

    protected _renderHeatmap(sightings: SightingsEntry[]): void {
        const grid: number[][] = Array.from({length: 7}, () => Array.from({length: 24}, () => 0));

        for (const s of sightings) {
            const d = parseDate(s);
            const h = parseHour(s);
            if (d && h >= 0) {
                grid[d.getDay()][h] += 1;
            }
        }

        const flat: {dow: number; hour: number; value: number;}[] = [];
        for (let dow = 0; dow < 7; dow++) {
            for (let hour = 0; hour < 24; hour++) {
                flat.push({dow, hour, value: grid[dow][hour]});
            }
        }

        const max = Math.max(1, ...flat.map((c) => c.value));

        const width = this._heatEl.width() ?? 320;
        const height = 240;
        const margin = {top: 10, right: 10, bottom: 30, left: 38};
        const innerW = width - margin.left - margin.right;
        const innerH = height - margin.top - margin.bottom;

        const cellW = innerW / 24;
        const cellH = innerH / 7;

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const svg = (d3 as any).select(this._heatEl[0]).append('svg').attr('width', width).attr('height', height);
        const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const color = (d3 as any).scaleSequential((d3 as any).interpolateBlues).domain([0, max]);

        g.selectAll('rect').data(flat).enter().append('rect')
        .attr('x', (d: {dow: number; hour: number; value: number;}) => d.hour * cellW)
        .attr('y', (d: {dow: number; hour: number; value: number;}) => d.dow * cellH)
        .attr('width', cellW - 1)
        .attr('height', cellH - 1)
        .attr('fill', (d: {dow: number; hour: number; value: number;}) => d.value === 0 ? '#f5f5f5' : color(d.value))
        .append('title')
        .text((d: {dow: number; hour: number; value: number;}) => `${DOW_LABELS[d.dow]} ${String(d.hour).padStart(2, '0')}:00 — ${d.value}`);

        // y-axis: weekday labels
        g.selectAll('.dow-label').data(DOW_LABELS).enter().append('text')
        .attr('x', -6).attr('y', (_d: string, i: number) => (i * cellH) + (cellH / 2) + 4)
        .attr('text-anchor', 'end').attr('font-size', 10)
        .text((d: string) => d);

        // x-axis: hour labels (every 3 hours)
        for (let h = 0; h < 24; h += 3) {
            g.append('text')
            .attr('x', (h * cellW) + (cellW / 2)).attr('y', innerH + 14)
            .attr('text-anchor', 'middle').attr('font-size', 10)
            .text(String(h).padStart(2, '0'));
        }
    }

    protected _renderHistogram(sightings: SightingsEntry[]): void {
        const sizes = sightings
        .map((s) => s.species_count ?? 0)
        .filter((n) => n >= 0);

        if (sizes.length === 0) {
            return;
        }

        const max = Math.max(1, ...sizes);

        // Bucket sizes: small numbers stay distinct, larger ones grouped.
        let bucketSize = 5;
        if (max <= 20) {
            bucketSize = 1;
        } else if (max <= 50) {
            bucketSize = 2;
        }
        const buckets = new Map<number, number>();
        for (const n of sizes) {
            const b = Math.floor(n / bucketSize) * bucketSize;
            buckets.set(b, (buckets.get(b) ?? 0) + 1);
        }

        const data = Array.from(buckets.entries())
        .map(([key, value]) => ({key, value, label: bucketSize === 1 ? `${key}` : `${key}-${key + bucketSize - 1}`}))
        .sort((a, b) => a.key - b.key);

        const width = this._histEl.width() ?? 320;
        const height = 240;
        const margin = {top: 10, right: 10, bottom: 35, left: 35};
        const innerW = width - margin.left - margin.right;
        const innerH = height - margin.top - margin.bottom;

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const svg = (d3 as any).select(this._histEl[0]).append('svg').attr('width', width).attr('height', height);
        const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const x = (d3 as any).scaleBand().domain(data.map((d) => d.label)).range([0, innerW]).padding(0.1);
        const yMax = Math.max(1, ...data.map((d) => d.value));
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const y = (d3 as any).scaleLinear().domain([0, yMax]).nice().range([innerH, 0]);

        const xAxisStep = Math.max(1, Math.ceil(data.length / 10));

        g.append('g').attr('transform', `translate(0,${innerH})`)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .call((d3 as any).axisBottom(x).tickValues(x.domain().filter((_d: string, i: number) => i % xAxisStep === 0)))
        .selectAll('text')
        .attr('transform', 'rotate(-30)')
        .attr('text-anchor', 'end')
        .attr('font-size', 10);

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        g.append('g').call((d3 as any).axisLeft(y).ticks(4)).selectAll('text').attr('font-size', 10);

        type Bar = {key: number; value: number; label: string;};
        g.selectAll('rect').data(data).enter().append('rect')
        .attr('x', (d: Bar) => x(d.label))
        .attr('y', (d: Bar) => y(d.value))
        .attr('width', x.bandwidth())
        .attr('height', (d: Bar) => innerH - y(d.value))
        .attr('fill', '#5b9bd5')
        .append('title')
        .text((d: Bar) => `Group size ${d.label}: ${d.value} sightings`);

        g.append('text')
        .attr('x', innerW / 2).attr('y', innerH + 30)
        .attr('text-anchor', 'middle').attr('font-size', 10)
        .text(`Group size${bucketSize === 1 ? '' : ` (bucket ${bucketSize})`}`);
    }

}