/* global JQuery */
import {Component} from 'bambooo';
import * as d3 from 'd3';
import {SightingsEntry} from '../Api/Sightings';
import {Lang} from '../Lang';

const DAY_MS = 24 * 60 * 60 * 1000;
const CALENDAR_CELL = 13;
const CALENDAR_YEAR_GAP = 28;
const CALENDAR_LEFT = 50;

const escapeHtml = (s: string): string => s
.replace(/&/gu, '&amp;')
.replace(/</gu, '&lt;')
.replace(/>/gu, '&gt;');

/**
 * Compute the day-of-year (1..366) for a given date, ignoring leap-year bumps
 * so all years line up on the x axis (Feb 29 collapses onto Mar 1's index).
 */
const dayOfYear = (d: Date): number => {
    const start = Date.UTC(d.getUTCFullYear(), 0, 0);
    const here = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
    return Math.floor((here - start) / DAY_MS);
};

const isoDay = (d: Date): string => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
};

const monthTickPositions: number[] = [1, 32, 60, 91, 121, 152, 182, 213, 244, 274, 305, 335];
const monthTickLabels: string[] = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/**
 * Year-on-year sightings comparison panel. Renders two stacked visualisations
 * over the same dataset:
 *   1. Cumulative-line "stock-index" overlay (one line per year, day-of-year on x).
 *   2. Calendar heatmap in the style of Mike Bostock's gist 4063318: one row of
 *      53×7 day cells per year, monthly outline paths, colour intensity scaled
 *      to the daily sighting count.
 */
export class SightingYearCompare extends Component<HTMLDivElement> {

    protected _statusEl: JQuery;

    protected _trendTitleEl: JQuery;

    protected _chartEl: JQuery;

    protected _calendarTitleEl: JQuery;

    protected _calendarEl: JQuery;

    public constructor(parent: JQuery) {
        const root = jQuery<HTMLDivElement>('<div class="sighting-yearcompare"/>').appendTo(parent);
        super(root);

        const lang = Lang.i();

        this._statusEl = jQuery('<div class="sighting-yearcompare-status"/>').appendTo(root);

        this._trendTitleEl = jQuery(`<h6 class="sighting-yearcompare-title">${escapeHtml(lang.l('Cumulative trend'))}</h6>`).appendTo(root);
        this._chartEl = jQuery('<div class="sighting-yearcompare-chart"/>').appendTo(root);

        this._calendarTitleEl = jQuery(`<h6 class="sighting-yearcompare-title">${escapeHtml(lang.l('Calendar'))}</h6>`).appendTo(root);
        this._calendarEl = jQuery('<div class="sighting-yearcompare-calendar"/>').appendTo(root);
    }

    public setData(sightings: SightingsEntry[]): void {
        this.clear();

        const lang = Lang.i();

        if (sightings.length === 0) {
            this._statusEl.text(lang.l('No sightings available for year-on-year comparison.'));
            return;
        }

        const byYear = new Map<number, SightingsEntry[]>();

        for (const s of sightings) {
            const datePart = (s.date ?? '').split(' ')[0];
            const t = Date.parse(datePart);
            if (!Number.isNaN(t)) {
                const year = new Date(t).getUTCFullYear();
                const list = byYear.get(year);
                if (list) {
                    list.push(s);
                } else {
                    byYear.set(year, [s]);
                }
            }
        }

        if (byYear.size === 0) {
            this._statusEl.text(lang.l('No dated sightings available.'));
            return;
        }

        const yearWord = byYear.size === 1 ? lang.l('year') : lang.l('years');
        const sortedYears = Array.from(byYear.keys()).sort((a, b) => a - b);

        this._statusEl.text(`${sightings.length} ${lang.l('sightings across')} ${byYear.size} ${yearWord} (${sortedYears[0]}–${sortedYears[sortedYears.length - 1]}).`);

        this._renderTrend(byYear);
        this._renderCalendar(sightings, sortedYears);
    }

    public clear(): void {
        this._chartEl.empty();
        this._calendarEl.empty();
        this._statusEl.text('');
    }

    /**
     * "Stock-index" cumulative line per year, day-of-year on x-axis.
     */
    protected _renderTrend(byYear: Map<number, SightingsEntry[]>): void {
        const lang = Lang.i();

        type Point = {day: number; cumulative: number;};
        type Series = {year: number; points: Point[]; total: number;};

        const series: Series[] = [];
        for (const [year, entries] of byYear.entries()) {
            const days: number[] = [];
            for (const e of entries) {
                const t = Date.parse((e.date ?? '').split(' ')[0]);
                if (!Number.isNaN(t)) {
                    days.push(dayOfYear(new Date(t)));
                }
            }
            days.sort((a, b) => a - b);

            const points: Point[] = [{day: 0, cumulative: 0}];
            let cum = 0;
            for (const day of days) {
                cum += 1;
                points.push({day, cumulative: cum});
            }
            series.push({year, points, total: cum});
        }

        series.sort((a, b) => a.year - b.year);

        const width = this._chartEl.width() ?? 900;
        const height = 380;
        const margin = {top: 20, right: 130, bottom: 35, left: 50};
        const innerW = width - margin.left - margin.right;
        const innerH = height - margin.top - margin.bottom;

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const svg = (d3 as any).select(this._chartEl[0]).append('svg').attr('width', width).attr('height', height);
        const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const x = (d3 as any).scaleLinear().domain([0, 366]).range([0, innerW]);
        const yMax = Math.max(1, ...series.map((s) => s.total));
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const y = (d3 as any).scaleLinear().domain([0, yMax]).nice().range([innerH, 0]);

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const color = (d3 as any).scaleOrdinal((d3 as any).schemeCategory10);

        // Gridlines for readability.
        g.append('g').attr('class', 'sighting-yc-grid')
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .call((d3 as any).axisLeft(y).ticks(6).tickSize(-innerW).tickFormat(() => ''))
        .selectAll('line').attr('stroke', '#eee');
        g.selectAll('.sighting-yc-grid path.domain').attr('stroke', 'none');

        // X-axis: month labels.
        const xAxis = g.append('g').attr('transform', `translate(0,${innerH})`);
        xAxis.append('line').attr('x1', 0).attr('x2', innerW).attr('stroke', '#000');
        xAxis.selectAll('.tick').data(monthTickPositions).enter().append('g')
        .attr('class', 'tick')
        .attr('transform', (d: number) => `translate(${x(d)},0)`)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any, prefer-arrow/prefer-arrow-functions
        .each(function tickRender(this: SVGGElement, _d: number, i: number): void {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const tick = (d3 as any).select(this);
            tick.append('line').attr('y2', 4).attr('stroke', '#000');
            tick.append('text').attr('y', 16).attr('text-anchor', 'middle').attr('font-size', 10)
            .text(monthTickLabels[i]);
        });

        // Y-axis.
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        g.append('g').call((d3 as any).axisLeft(y).ticks(6)).selectAll('text').attr('font-size', 10);
        g.append('text')
        .attr('transform', 'rotate(-90)').attr('x', -innerH / 2).attr('y', -36)
        .attr('text-anchor', 'middle').attr('font-size', 11)
        .text(lang.l('Cumulative sightings'));

        // Lines (one per year).
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const line = (d3 as any).line()
        .x((d: Point) => x(d.day))
        .y((d: Point) => y(d.cumulative))
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .curve((d3 as any).curveStepAfter);

        for (let i = 0; i < series.length; i++) {
            const s = series[i];
            g.append('path')
            .datum(s.points)
            .attr('fill', 'none')
            .attr('stroke', color(`${i}`))
            .attr('stroke-width', 1.6)
            .attr('d', line)
            .append('title')
            .text(`${s.year}: ${s.total}`);
        }

        // Legend.
        const legend = svg.append('g').attr('transform', `translate(${width - margin.right + 10},${margin.top})`);
        const legendItem = legend.selectAll('g').data(series).enter().append('g')
        .attr('transform', (_d: Series, i: number) => `translate(0,${i * 18})`);
        legendItem.append('rect').attr('width', 12).attr('height', 12)
        .attr('fill', (_d: Series, i: number) => color(`${i}`));
        legendItem.append('text').attr('x', 16).attr('y', 10).attr('font-size', 11)
        .text((d: Series) => `${d.year} — ${d.total}`);

        // Hover guide.
        const guide = g.append('line')
        .attr('y1', 0).attr('y2', innerH)
        .attr('stroke', '#999').attr('stroke-dasharray', '2,2')
        .style('opacity', 0);
        const readout = jQuery('<div class="sighting-yearcompare-tooltip"/>').appendTo(this._chartEl).hide();

        const valueAt = (s: Series, dayIdx: number): number => {
            let cum = 0;
            for (const p of s.points) {
                if (p.day <= dayIdx) {
                    cum = p.cumulative;
                } else {
                    break;
                }
            }
            return cum;
        };

        const dayLabel = lang.l('Day');

        svg.append('rect')
        .attr('x', margin.left).attr('y', margin.top)
        .attr('width', innerW).attr('height', innerH)
        .attr('fill', 'none').attr('pointer-events', 'all')
        // eslint-disable-next-line @typescript-eslint/no-explicit-any, prefer-arrow/prefer-arrow-functions
        .on('mousemove', function onMove(this: SVGRectElement, event: MouseEvent): void {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const [mx] = (d3 as any).pointer(event, this);
            const day = Math.round(x.invert(mx - margin.left));
            guide.attr('x1', x(day)).attr('x2', x(day)).style('opacity', 1);

            const lines = series.map((s, i) => {
                const swatch = `<span style="display:inline-block;width:8px;height:8px;background:${color(`${i}`)};margin-right:4px;"></span>`;
                return `${swatch}${escapeHtml(`${s.year}`)}: ${valueAt(s, day)}`;
            }).join('<br>');
            const label = `<b>${escapeHtml(dayLabel)} ${day}</b><br>${lines}`;

            readout.html(label).css({
                left: `${event.offsetX + 12}px`,
                top: `${event.offsetY + 12}px`
            }).show();
        })
        .on('mouseleave', () => {
            guide.style('opacity', 0);
            readout.hide();
        });
    }

    /**
     * Calendar heatmap after Mike Bostock's gist 4063318: one strip of
     * 53 weeks × 7 days per year, daily counts colour-coded, month-outline
     * paths overlaid for readability.
     */
    protected _renderCalendar(sightings: SightingsEntry[], sortedYears: number[]): void {
        const dailyCounts = new Map<string, number>();

        for (const s of sightings) {
            const datePart = (s.date ?? '').split(' ')[0];
            if (datePart !== '') {
                dailyCounts.set(datePart, (dailyCounts.get(datePart) ?? 0) + 1);
            }
        }

        const maxDaily = Math.max(1, ...Array.from(dailyCounts.values()));
        const cell = CALENDAR_CELL;
        const rowH = (cell * 7) + CALENDAR_YEAR_GAP;
        const width = (CALENDAR_LEFT + (53 * cell)) + 30;
        const height = (sortedYears.length * rowH) + 50;

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const svg = (d3 as any).select(this._calendarEl[0]).append('svg')
        .attr('width', width).attr('height', height);

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const color = (d3 as any).scaleSequential((d3 as any).interpolateBlues).domain([0, maxDaily]);

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const timeWeek = (d3 as any).timeWeek;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const timeYear = (d3 as any).timeYear;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const timeDays = (d3 as any).timeDays;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const timeMonths = (d3 as any).timeMonths;

        const monthPath = (t0: Date): string => {
            const t1 = new Date(t0.getFullYear(), t0.getMonth() + 1, 0);
            const d0 = t0.getDay();
            const w0 = timeWeek.count(timeYear(t0), t0);
            const d1 = t1.getDay();
            const w1 = timeWeek.count(timeYear(t1), t1);
            return `M${(w0 + 1) * cell},${d0 * cell}` +
                   `H${w0 * cell}V${7 * cell}` +
                   `H${w1 * cell}V${(d1 + 1) * cell}` +
                   `H${(w1 + 1) * cell}V0` +
                   `H${(w0 + 1) * cell}Z`;
        };

        for (let yi = 0; yi < sortedYears.length; yi++) {
            const year = sortedYears[yi];
            const yearY = (yi * rowH) + 20;

            const yearG = svg.append('g').attr('transform', `translate(${CALENDAR_LEFT},${yearY})`);

            yearG.append('text')
            .attr('x', -6).attr('y', ((cell * 7) / 2) + 4)
            .attr('text-anchor', 'end')
            .attr('font-size', 12).attr('font-weight', 'bold')
            .text(year);

            const start = new Date(year, 0, 1);
            const end = new Date(year + 1, 0, 1);

            const days: Date[] = timeDays(start, end);

            yearG.selectAll('rect').data(days).enter().append('rect')
            .attr('width', cell - 1).attr('height', cell - 1)
            .attr('x', (d: Date) => timeWeek.count(timeYear(d), d) * cell)
            .attr('y', (d: Date) => d.getDay() * cell)
            .attr('fill', (d: Date) => {
                const c = dailyCounts.get(isoDay(d)) ?? 0;
                return c === 0 ? '#f5f5f5' : color(c);
            })
            .attr('stroke', '#fff').attr('stroke-width', 0.5)
            .append('title')
            .text((d: Date) => `${isoDay(d)}: ${dailyCounts.get(isoDay(d)) ?? 0}`);

            // Month-outline paths.
            const months: Date[] = timeMonths(start, end);
            yearG.selectAll('.cal-month').data(months).enter().append('path')
            .attr('class', 'cal-month')
            .attr('fill', 'none')
            .attr('stroke', '#444').attr('stroke-width', 1)
            .attr('d', (d: Date) => monthPath(d));
        }

        // Day-of-week labels (column on the left of every year's strip).
        const dowLabels = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
        for (let yi = 0; yi < sortedYears.length; yi++) {
            const yearY = (yi * rowH) + 20;
            for (let di = 0; di < 7; di++) {
                svg.append('text')
                .attr('x', CALENDAR_LEFT - 18).attr('y', yearY + (di * cell) + cell - 2)
                .attr('font-size', 9).attr('fill', '#888')
                .text(dowLabels[di]);
            }
        }

        // Legend (gradient bar) at the bottom.
        const legendY = (sortedYears.length * rowH) + 20;
        const legendW = 200;
        const legendG = svg.append('g').attr('transform', `translate(${CALENDAR_LEFT},${legendY})`);

        const grad = svg.append('defs').append('linearGradient')
        .attr('id', 'sighting-cal-grad')
        .attr('x1', '0%').attr('x2', '100%').attr('y1', '0%').attr('y2', '0%');

        for (let i = 0; i <= 10; i++) {
            grad.append('stop')
            .attr('offset', `${i * 10}%`)
            .attr('stop-color', color((maxDaily * i) / 10));
        }

        legendG.append('rect').attr('width', legendW).attr('height', 8)
        .attr('fill', 'url(#sighting-cal-grad)');
        legendG.append('text').attr('x', 0).attr('y', 22).attr('font-size', 10).text('0');
        legendG.append('text').attr('x', legendW).attr('y', 22).attr('text-anchor', 'end').attr('font-size', 10)
        .text(`${maxDaily}`);
    }

}