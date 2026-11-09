/* global JQuery */
import {ComponentType, Widget2} from 'bambooo';
import * as d3raw from 'd3';
import {SightingsEntry} from '../Api/Sightings';
import {Lang} from '../Lang';
import {AdminListUi} from './AdminListUi';
import {ChartTooltip} from './ChartTooltip';

/*
 * Same d3-as-any pattern the rest of the project uses (see
 * CrossSpeciesAnalytics): the d3 typings are not wired into this build.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const d3: any = d3raw;

/**
 * Figures of one year.
 */
type YearStats = {
    year: number;
    sightings: number;
    animals: number;
    species: number;
    tours: number;
    first: string;
    last: string;
    // sightings per day-of-year (1..365), Feb 29 folded onto Feb 28
    perDay: number[];
    perMonth: number[];
    // last day-of-year with data coverage (today for the running year)
    endDay: number;
    running: boolean;
    partial: boolean;
};

export type SightingYearCompareMode = 'cumulative' | 'monthly';

/**
 * SightingYearCompare
 *
 * "Year comparison" tab of the sighting page, over all years (the period
 * filter is ignored, all other filters apply):
 *  - key figures incl. the running year against the same period last year,
 *  - a table per year (sightings, change, animals, species, tours, coverage),
 *  - cumulative or monthly lines per year on a shared Jan–Dec axis,
 *  - a calendar heatmap per year.
 * Years are coloured by age: the running/latest year in the accent colour,
 * the year before in the primary colour, older years in fading greys.
 */
export class SightingYearCompare extends Widget2 {

    protected static readonly _MONTH_KEYS = [
        'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
        'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
    ];

    // day-of-year of the first day of each month (non-leap year)
    protected static readonly _MONTH_START = [1, 32, 60, 91, 121, 152, 182, 213, 244, 274, 305, 335];

    protected static readonly _OLD_YEAR_COLORS = ['#7d8a99', '#a3adb8', '#c3cad2', '#d8dde3'];

    protected _data: SightingsEntry[] = [];

    protected _years: YearStats[] = [];

    protected _mode: SightingYearCompareMode = 'cumulative';

    protected _renderedWidth: number = 0;

    protected _tip: ChartTooltip;

    protected _statsEl: JQuery;

    protected _emptyEl: JQuery;

    protected _contentEl: JQuery;

    protected _tableEl: JQuery;

    protected _trendEl: JQuery;

    protected _trendFigure: JQuery;

    protected _modeButtons: JQuery;

    protected _calendarEl: JQuery;

    public constructor(parent: ComponentType) {
        super({
            element: jQuery('<div class="sighting-analytics sighting-yearcompare"/>')
        });

        const root = this._element;
        root.appendTo(SightingYearCompare._asParent(parent));

        const lang = Lang.i();

        this._statsEl = jQuery('<div class="d-flex flex-wrap gap-2 mb-3"/>').appendTo(root);
        this._emptyEl = jQuery('<div class="text-center text-body-secondary py-5 d-none"/>').appendTo(root);
        jQuery('<i class="far fa-calendar fa-2x mb-2 d-block opacity-50"/>').appendTo(this._emptyEl);
        jQuery('<span/>').text(lang.l('No sightings available for year-on-year comparison.')).appendTo(this._emptyEl);

        this._contentEl = jQuery('<div class="sighting-analytics-grid"/>').appendTo(root);

        // trend card with mode switch
        const trend = this._card('fas fa-chart-line', 'Course of the year', 'All years on one Jan–Dec axis');
        this._trendEl = trend.body;
        this._trendFigure = trend.figure;
        this._modeButtons = jQuery('<div class="btn-group btn-group-sm ms-2" role="group"/>').insertAfter(trend.figure);

        const modes: [SightingYearCompareMode, string][] = [['cumulative', 'Cumulative'], ['monthly', 'Per month']];

        for (const [mode, label] of modes) {
            jQuery('<button type="button" class="btn btn-outline-secondary"/>')
            .attr('data-mode', mode)
            .text(lang.l(label))
            .on('click', () => {
                this._mode = mode;
                this._render();
            })
            .appendTo(this._modeButtons);
        }

        this._tableEl = this._card('fas fa-table', 'Years', 'Change against the previous year').body;
        this._calendarEl = this._card('far fa-calendar-alt', 'Calendar', 'Sightings per day').body;

        this._tip = new ChartTooltip(root);

        if (typeof ResizeObserver !== 'undefined') {
            new ResizeObserver(() => {
                const width = this._contentEl.width() ?? 0;

                if (width > 0 && Math.abs(width - this._renderedWidth) > 4) {
                    window.requestAnimationFrame(() => this._render());
                }
            }).observe(root[0]);
        }
    }

    public setData(sightings: SightingsEntry[]): void {
        this._data = sightings;
        this._years = SightingYearCompare._yearStats(sightings, new Date());
        this._render();
    }

    public clear(): void {
        this._data = [];
        this._years = [];
        this._statsEl.empty();
        this._trendEl.empty();
        this._trendFigure.empty();
        this._tableEl.empty();
        this._calendarEl.empty();
        this._renderedWidth = 0;
    }

    protected _render(): void {
        this._statsEl.empty();
        this._trendEl.empty();
        this._trendFigure.empty();
        this._tableEl.empty();
        this._calendarEl.empty();
        this._tip.hide();

        this._modeButtons.find('button').each((_i, btn) => {
            const active = jQuery(btn).attr('data-mode') === this._mode;
            jQuery(btn).toggleClass('active', active).attr('aria-pressed', active ? 'true' : 'false');
        });

        const empty = this._years.length === 0;
        this._emptyEl.toggleClass('d-none', !empty);
        this._contentEl.toggleClass('d-none', empty);
        this._statsEl.toggleClass('d-none', empty);

        if (empty) {
            return;
        }

        // hidden tab: nothing to measure — the tab's `shown` handler loads/sets the data
        const width = this._contentEl.width() ?? 0;

        if (width <= 0) {
            return;
        }

        this._renderedWidth = width;

        this._renderStats();

        if (this._mode === 'cumulative') {
            this._renderCumulative();
        } else {
            this._renderMonthly();
        }

        this._renderTable();
        this._renderCalendar();
        ChartTooltip.fluid(this._element);
    }

    /*
     * ---------------------------------------------------------------------------------------------
     * Key figures + table
     * ---------------------------------------------------------------------------------------------
     */

    protected _renderStats(): void {
        const lang = Lang.i();
        const years = this._years;
        const complete = years.filter((year) => !year.partial && !year.running);
        const best = years.reduce((top, year) => year.sightings > top.sightings ? year : top, years[0]);
        const average = complete.length > 0
            ? complete.reduce((sum, year) => sum + year.sightings, 0) / complete.length
            : 0;

        AdminListUi.stat(this._statsEl, 'far fa-calendar', `${years.length}`, 'Years', 'text-primary');
        AdminListUi.stat(this._statsEl, 'fas fa-trophy', `${best.year} · ${best.sightings.toLocaleString()}`, 'Best year', 'text-warning');

        if (complete.length > 0) {
            AdminListUi.stat(
                this._statsEl,
                'fas fa-balance-scale',
                Math.round(average).toLocaleString(),
                'Average per complete year'
            ).attr('title', complete.map((year) => year.year).join(', '));
        }

        // latest year against the same day range of the year before
        const latest = years[years.length - 1];
        const before = years.find((year) => year.year === latest.year - 1);

        if (before) {
            const now = SightingYearCompare._sum(latest.perDay, latest.endDay);
            const then = SightingYearCompare._sum(before.perDay, latest.endDay);
            const until = SightingYearCompare._dayLabel(latest.endDay);
            const change = SightingYearCompare._change(now, then);

            const stat = AdminListUi.stat(
                this._statsEl,
                'fas fa-exchange-alt',
                `${now.toLocaleString()} ${lang.l('vs.')} ${then.toLocaleString()}`,
                `${latest.year} ${lang.l('vs.')} ${before.year}, ${lang.l('until')} ${until}`,
                'text-info'
            );

            if (change !== null) {
                SightingYearCompare._changePill(stat.find('.fw-bold'), change).addClass('ms-2');
            }
        }
    }

    protected _renderTable(): void {
        const lang = Lang.i();
        const max = Math.max(1, ...this._years.map((year) => year.sightings));
        const table = jQuery('<table class="table table-sm align-middle mb-0 sighting-yearcompare-table"/>').appendTo(this._tableEl);
        const head = jQuery('<tr/>').appendTo(jQuery('<thead/>').appendTo(table));

        const columns: [string, string][] = [
            ['Year', ''],
            ['Sightings', ''],
            ['Previous year', 'text-end'],
            ['Animals', 'text-end'],
            ['Species', 'text-end'],
            ['Tours', 'text-end'],
            ['Sightings per tour', 'text-end'],
            ['Data', '']
        ];

        for (const [label, cls] of columns) {
            jQuery('<th class="small text-body-secondary fw-semibold"/>').addClass(cls).text(lang.l(label)).appendTo(head);
        }

        const body = jQuery('<tbody/>').appendTo(table);
        const years = [...this._years].reverse();

        for (const year of years) {
            const tr = jQuery('<tr/>').appendTo(body);
            const yearCell = jQuery('<td class="fw-semibold text-nowrap"/>').appendTo(tr);
            jQuery('<span class="sighting-yearcompare-swatch"/>').css('background', this._colorOf(year.year)).appendTo(yearCell);
            jQuery('<span/>').text(`${year.year}`).appendTo(yearCell);

            const countCell = jQuery('<td style="min-width: 160px;"/>').appendTo(tr);
            const countWrap = jQuery('<div class="d-flex align-items-center gap-2"/>').appendTo(countCell);
            jQuery('<span class="fw-semibold text-end" style="min-width: 3.5em;"/>').text(year.sightings.toLocaleString()).appendTo(countWrap);
            const track = jQuery('<div class="sighting-yearcompare-track flex-grow-1"/>').appendTo(countWrap);
            jQuery('<div/>')
            .css({width: `${(year.sightings / max) * 100}%`, background: this._colorOf(year.year)})
            .appendTo(track);

            // change against the previous year — only meaningful when both are complete
            const changeCell = jQuery('<td class="text-end text-nowrap"/>').appendTo(tr);
            const previous = this._years.find((other) => other.year === year.year - 1);
            const change = previous ? SightingYearCompare._change(year.sightings, previous.sightings) : null;

            if (change === null) {
                jQuery('<span class="text-body-tertiary"/>').text('–').appendTo(changeCell);
            } else if (year.partial || year.running || previous?.partial) {
                jQuery('<span class="text-body-tertiary"/>')
                .text(SightingYearCompare._changeText(change))
                .attr('title', lang.l('Not comparable: one of the years is incomplete'))
                .appendTo(changeCell);
            } else {
                SightingYearCompare._changePill(changeCell, change);
            }

            jQuery('<td class="text-end"/>').text(year.animals.toLocaleString()).appendTo(tr);
            jQuery('<td class="text-end"/>').text(`${year.species}`).appendTo(tr);
            jQuery('<td class="text-end"/>').text(year.tours.toLocaleString()).appendTo(tr);
            jQuery('<td class="text-end"/>')
            .text(year.tours > 0 ? (year.sightings / year.tours).toLocaleString(undefined, {maximumFractionDigits: 1}) : '–')
            .appendTo(tr);

            const dataCell = jQuery('<td class="small text-body-secondary text-nowrap"/>').appendTo(tr);
            jQuery('<span/>')
            .text(`${SightingYearCompare._formatDay(year.first)} – ${SightingYearCompare._formatDay(year.last)}`)
            .appendTo(dataCell);

            if (year.running) {
                AdminListUi.pill(dataCell, 'running', 'primary', 'fas fa-play').addClass('ms-2');
            } else if (year.partial) {
                AdminListUi.pill(dataCell, 'incomplete', 'warning', 'fas fa-adjust').addClass('ms-2')
                .attr('title', lang.l('No data for the whole year'));
            }
        }
    }

    /*
     * ---------------------------------------------------------------------------------------------
     * Trend charts
     * ---------------------------------------------------------------------------------------------
     */

    protected _renderCumulative(): void {
        const lang = Lang.i();

        type Point = {day: number; value: number;};

        const series = this._years.map((year) => {
            const points: Point[] = [];
            const startDay = Math.max(1, SightingYearCompare._dayOfYear(year.first));
            let sum = SightingYearCompare._sum(year.perDay, startDay - 1);

            points.push({day: startDay - 1, value: sum});

            for (let day = startDay; day <= year.endDay; day++) {
                sum += year.perDay[day] ?? 0;
                points.push({day, value: sum});
            }

            return {year, points, total: sum};
        });

        this._trendFigure.text(lang.l('Sightings since 1 January'));

        const chart = this._lineFrame(Math.max(1, ...series.map((item) => item.total)), 'cumulative');

        for (const item of series) {
            chart.g.append('path')
            .datum(item.points)
            .attr('fill', 'none')
            .attr('stroke', this._colorOf(item.year.year))
            .attr('stroke-width', this._isLatest(item.year.year) ? 2.5 : 1.75)
            .attr('d', d3.line()
            .x((p: Point) => chart.x(p.day))
            .y((p: Point) => chart.y(p.value))
            .curve(d3.curveStepAfter));
        }

        this._endLabels(chart, series.map((item) => ({
            year: item.year.year,
            x: item.points[item.points.length - 1].day,
            value: item.total
        })));

        this._crosshair(chart, (day) => {
            const rows = series
            .filter((item) => day >= item.points[0].day && day <= item.year.endDay)
            .map((item) => {
                const point = item.points.find((p) => p.day === day) ?? item.points[0];
                return {year: item.year.year, value: point.value};
            });

            return {
                title: SightingYearCompare._dayLabel(day),
                rows,
                xDay: day
            };
        });
    }

    protected _renderMonthly(): void {
        const lang = Lang.i();

        type Point = {month: number; value: number;};

        const series = this._years.map((year) => {
            const firstMonth = parseInt(year.first.slice(5, 7), 10) - 1;
            const lastMonth = parseInt(year.last.slice(5, 7), 10) - 1;
            let endMonth = 11;

            if (year.running) {
                endMonth = SightingYearCompare._monthOfDay(year.endDay);
            } else if (year.partial) {
                endMonth = lastMonth;
            }

            const points: Point[] = [];

            for (let month = year.partial && !year.running ? firstMonth : 0; month <= endMonth; month++) {
                points.push({month, value: year.perMonth[month]});
            }

            return {year, points};
        });

        const max = Math.max(1, ...series.flatMap((item) => item.points.map((p) => p.value)));
        this._trendFigure.text(lang.l('Sightings per month'));

        const chart = this._lineFrame(max, 'monthly');
        const midDay = (month: number): number => SightingYearCompare._MONTH_START[month] + 14;

        for (const item of series) {
            const color = this._colorOf(item.year.year);
            const latest = this._isLatest(item.year.year);

            chart.g.append('path')
            .datum(item.points)
            .attr('fill', 'none')
            .attr('stroke', color)
            .attr('stroke-width', latest ? 2.5 : 1.75)
            .attr('d', d3.line()
            .x((p: Point) => chart.x(midDay(p.month)))
            .y((p: Point) => chart.y(p.value))
            .curve(d3.curveMonotoneX));

            chart.g.selectAll(null).data(item.points).enter().append('circle')
            .attr('class', 'sighting-yearcompare-dot')
            .attr('cx', (p: Point) => chart.x(midDay(p.month)))
            .attr('cy', (p: Point) => chart.y(p.value))
            .attr('r', latest ? 3.5 : 2.5)
            .style('fill', color);
        }

        this._endLabels(chart, series.filter((item) => item.points.length > 0).map((item) => {
            const lastPoint = item.points[item.points.length - 1];
            return {year: item.year.year, x: midDay(lastPoint.month), value: lastPoint.value};
        }));

        this._crosshair(chart, (day) => {
            const month = SightingYearCompare._monthOfDay(day);
            const rows = series
            .map((item) => ({year: item.year.year, point: item.points.find((p) => p.month === month)}))
            .filter((row) => row.point !== undefined)
            .map((row) => ({year: row.year, value: row.point?.value ?? 0}));

            return {
                title: lang.l(SightingYearCompare._MONTH_KEYS[month]),
                rows,
                xDay: midDay(month)
            };
        });
    }

    /**
     * Axes, grid and month ticks of the trend chart.
     * @param {number} max
     * @param {SightingYearCompareMode} mode
     * @return {object}
     * @protected
     */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    protected _lineFrame(max: number, mode: SightingYearCompareMode): {g: any; x: any; y: any; innerW: number; innerH: number; margin: {left: number; top: number;};} {
        const lang = Lang.i();
        const width = Math.max(320, this._trendEl.width() ?? 0);
        const height = 340;
        const margin = {top: 12, right: 64, bottom: 26, left: 44};
        const innerW = width - margin.left - margin.right;
        const innerH = height - margin.top - margin.bottom;
        const x = d3.scaleLinear().domain([0, 365]).range([0, innerW]);
        const y = d3.scaleLinear().domain([0, max]).nice().range([innerH, 0]);

        const svg = d3.select(this._trendEl[0]).append('svg')
        .attr('width', width)
        .attr('height', height)
        .attr('role', 'img')
        .attr('aria-label', lang.l(mode === 'cumulative' ? 'Cumulative' : 'Per month'));
        const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

        for (const tick of y.ticks(5)) {
            g.append('line')
            .attr('class', 'sighting-analytics-grid-line')
            .attr('x1', 0)
            .attr('x2', innerW)
            .attr('y1', y(tick))
            .attr('y2', y(tick));

            g.append('text')
            .attr('class', 'sighting-analytics-axis')
            .attr('x', -6)
            .attr('y', y(tick))
            .attr('dy', '0.32em')
            .attr('text-anchor', 'end')
            .text(tick.toLocaleString());
        }

        SightingYearCompare._MONTH_START.forEach((start, month) => {
            if (month > 0) {
                g.append('line')
                .attr('class', 'sighting-yearcompare-month-line')
                .attr('x1', x(start - 1))
                .attr('x2', x(start - 1))
                .attr('y1', 0)
                .attr('y2', innerH);
            }

            g.append('text')
            .attr('class', 'sighting-analytics-axis')
            .attr('x', x(start + 14))
            .attr('y', innerH + 17)
            .attr('text-anchor', 'middle')
            .text(lang.l(SightingYearCompare._MONTH_KEYS[month]));
        });

        g.append('line')
        .attr('class', 'sighting-analytics-baseline')
        .attr('x1', 0)
        .attr('x2', innerW)
        .attr('y1', innerH)
        .attr('y2', innerH);

        return {g, x, y, innerW, innerH, margin};
    }

    /**
     * Year labels at the line ends, nudged apart so they don't overlap.
     * @param {object} chart
     * @param {object[]} ends
     * @protected
     */
    protected _endLabels(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        chart: {g: any; x: any; y: any; innerW: number;},
        ends: {year: number; x: number; value: number;}[]
    ): void {
        const placed = ends
        .map((end) => ({...end, px: chart.x(end.x), py: chart.y(end.value)}))
        .sort((a, b) => a.py - b.py);

        for (let i = 1; i < placed.length; i++) {
            if (placed[i].py - placed[i - 1].py < 13) {
                placed[i].py = placed[i - 1].py + 13;
            }
        }

        for (const end of placed) {
            chart.g.append('text')
            .attr('class', 'sighting-yearcompare-end-label')
            .attr('x', end.px + 6)
            .attr('y', end.py)
            .attr('dy', '0.32em')
            .style('font-weight', this._isLatest(end.year) ? '700' : '500')
            .text(`${end.year}`);
        }
    }

    /**
     * Crosshair + tooltip over the trend chart.
     * @param {object} chart
     * @param {Function} rowsAt day-of-year → tooltip title and values per year
     * @protected
     */
    protected _crosshair(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        chart: {g: any; x: any; y: any; innerW: number; innerH: number;},
        rowsAt: (day: number) => {title: string; rows: {year: number; value: number;}[]; xDay: number;}
    ): void {
        const lang = Lang.i();
        const guide = chart.g.append('line')
        .attr('class', 'sighting-yearcompare-guide')
        .attr('y1', 0)
        .attr('y2', chart.innerH)
        .style('opacity', 0);
        const dots = chart.g.append('g');

        chart.g.append('rect')
        .attr('width', chart.innerW)
        .attr('height', chart.innerH)
        .attr('fill', 'transparent')
        .on('mousemove', (event: MouseEvent) => {
            const [mx] = d3.pointer(event, event.currentTarget);
            const day = Math.min(365, Math.max(1, Math.round(chart.x.invert(mx))));
            const info = rowsAt(day);
            const gx = chart.x(info.xDay);

            guide.attr('x1', gx).attr('x2', gx).style('opacity', 1);
            dots.selectAll('*').remove();

            const rows = [...info.rows].sort((a, b) => b.year - a.year);

            for (const row of rows) {
                dots.append('circle')
                .attr('class', 'sighting-yearcompare-dot')
                .attr('cx', gx)
                .attr('cy', chart.y(row.value))
                .attr('r', 4)
                .style('fill', this._colorOf(row.year));
            }

            const lines = rows.map((row) => '<div class="d-flex align-items-center gap-2">' +
                `<span class="sighting-yearcompare-swatch" style="background:${this._colorOf(row.year)}"></span>` +
                `<span class="flex-grow-1">${row.year}</span><b>${row.value.toLocaleString()}</b></div>`).join('');

            this._tip.show(
                `<div class="fw-semibold mb-1">${AdminListUi.escape(info.title)}</div>${ 
                    lines === '' ? `<span class="text-body-secondary">${lang.l('No data')}</span>` : lines}`,
                event
            );
        })
        .on('mouseleave', () => {
            guide.style('opacity', 0);
            dots.selectAll('*').remove();
            this._tip.hide();
        });
    }

    /*
     * ---------------------------------------------------------------------------------------------
     * Calendar
     * ---------------------------------------------------------------------------------------------
     */

    protected _renderCalendar(): void {
        const lang = Lang.i();
        const daily = new Map<string, number>();

        for (const entry of this._data) {
            const day = SightingYearCompare._day(entry);

            if (day !== '') {
                daily.set(day, (daily.get(day) ?? 0) + 1);
            }
        }

        const width = Math.max(320, this._calendarEl.width() ?? 0);
        const left = 44;
        const cell = Math.max(6, Math.min(22, Math.floor((width - left - 4) / 54)));
        const yearH = (cell * 7) + 26;
        const years = [...this._years].reverse();
        const max = Math.max(1, ...daily.values());
        const opacity = d3.scaleSqrt().domain([1, max]).range([0.2, 1]);
        const weekdays = ['Mon', 'Wed', 'Fri'];

        const svg = d3.select(this._calendarEl[0]).append('svg')
        .attr('width', width)
        .attr('height', (years.length * yearH) + 40)
        .attr('role', 'img');

        years.forEach((stats, index) => {
            const year = stats.year;
            // first strip leaves room for the month labels
            const g = svg.append('g').attr('transform', `translate(${left},${(index * yearH) + 36})`);
            const start = new Date(year, 0, 1);
            const end = new Date(year + 1, 0, 1);
            const week = (date: Date): number => d3.timeMonday.count(d3.timeYear(date), date);
            const weekday = (date: Date): number => (date.getDay() + 6) % 7;

            g.append('text')
            .attr('class', 'sighting-yearcompare-cal-year')
            .attr('x', 0)
            .attr('y', -6)
            .text(`${year}`);

            g.append('text')
            .attr('class', 'sighting-analytics-axis')
            .attr('x', (54 * cell) - 2)
            .attr('y', -6)
            .attr('text-anchor', 'end')
            .text(`${stats.sightings.toLocaleString()} ${lang.l('Sightings')}`);

            weekdays.forEach((label, i) => {
                g.append('text')
                .attr('class', 'sighting-analytics-axis')
                .attr('x', -6)
                .attr('y', ((i * 2) * cell) + (cell / 2))
                .attr('dy', '0.32em')
                .attr('text-anchor', 'end')
                .style('font-size', '9px')
                .text(lang.l(label));
            });

            for (const date of d3.timeDays(start, end) as Date[]) {
                const key = SightingYearCompare._isoDay(date);
                const count = daily.get(key) ?? 0;
                const rect = g.append('rect')
                .attr('x', (week(date) * cell) + 1)
                .attr('y', (weekday(date) * cell) + 1)
                .attr('width', cell - 2)
                .attr('height', cell - 2)
                .attr('rx', 2);

                if (count === 0) {
                    rect.attr('class', 'sighting-analytics-cell-empty');
                } else {
                    rect.style('fill', 'var(--mwpa-chart-primary)').style('fill-opacity', opacity(count));
                }

                const dateText = date.toLocaleDateString(undefined, {weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric'});
                this._tip.bind(rect, `<b>${dateText}</b><br>${count.toLocaleString()} ${lang.l('Sightings')}`);
            }

            // month labels above the first week of each month
            for (let month = 0; month < 12; month++) {
                const first = new Date(year, month, 1);

                if (index === 0) {
                    g.append('text')
                    .attr('class', 'sighting-analytics-axis')
                    .attr('x', (week(first) * cell) + (weekday(first) === 0 ? 0 : cell))
                    .attr('y', -20)
                    .text(lang.l(SightingYearCompare._MONTH_KEYS[month]));
                }

                if (month > 0) {
                    const x = (week(first) * cell) + (weekday(first) === 0 ? 0 : cell);
                    g.append('line')
                    .attr('class', 'sighting-yearcompare-month-line')
                    .attr('x1', x)
                    .attr('x2', x)
                    .attr('y1', 0)
                    .attr('y2', 7 * cell);
                }
            }
        });

        // legend
        const legend = jQuery('<div class="d-flex align-items-center gap-1 small text-body-secondary mt-1"/>').appendTo(this._calendarEl);
        jQuery('<span class="me-1"/>').text('0').appendTo(legend);

        for (const value of [0, 0.25, 0.5, 0.75, 1]) {
            const box = jQuery('<span class="sighting-yearcompare-legend-box"/>').appendTo(legend);

            if (value === 0) {
                box.addClass('empty');
            } else {
                box.css('opacity', value);
            }
        }

        jQuery('<span class="ms-1"/>').text(`${max} ${lang.l('Sightings per day')}`).appendTo(legend);
    }

    /*
     * ---------------------------------------------------------------------------------------------
     * Helpers
     * ---------------------------------------------------------------------------------------------
     */

    protected _card(icon: string, title: string, hint: string): {body: JQuery; figure: JQuery;} {
        const lang = Lang.i();
        const card = jQuery('<div class="sighting-analytics-card sighting-analytics-wide"/>').appendTo(this._contentEl);
        const head = jQuery('<div class="d-flex align-items-start gap-2 mb-2"/>').appendTo(card);
        jQuery('<i class="text-body-secondary small mt-1"/>').addClass(icon).appendTo(head);
        const titles = jQuery('<div class="flex-grow-1 lh-sm"/>').appendTo(head);
        jQuery('<div class="fw-semibold small text-uppercase text-body-secondary"/>').text(lang.l(title)).appendTo(titles);
        jQuery('<div class="small text-body-tertiary"/>').text(lang.l(hint)).appendTo(titles);
        const figure = jQuery('<div class="sighting-analytics-figure small fw-semibold text-nowrap mt-1"/>').appendTo(head);
        const body = jQuery('<div class="sighting-analytics-body"/>').appendTo(card);

        return {body, figure};
    }

    protected _isLatest(year: number): boolean {
        return this._years.length > 0 && this._years[this._years.length - 1].year === year;
    }

    /**
     * Colour by age: latest year accent, the one before primary, older ones grey.
     * @param {number} year
     * @return {string}
     * @protected
     */
    protected _colorOf(year: number): string {
        const latest = this._years.length > 0 ? this._years[this._years.length - 1].year : year;
        const age = latest - year;

        if (age <= 0) {
            return 'var(--mwpa-chart-accent)';
        }

        if (age === 1) {
            return 'var(--mwpa-chart-primary)';
        }

        const olds = SightingYearCompare._OLD_YEAR_COLORS;
        return olds[Math.min(age - 2, olds.length - 1)];
    }

    /**
     * Figures per year, sorted ascending.
     * @param {SightingsEntry[]} sightings
     * @param {Date} today
     * @return {YearStats[]}
     * @protected
     */
    protected static _yearStats(sightings: SightingsEntry[], today: Date): YearStats[] {
        type Acc = YearStats & {speciesSet: Set<number>; tourSet: Set<number>;};
        const byYear = new Map<number, Acc>();

        for (const entry of sightings) {
            const day = SightingYearCompare._day(entry);

            if (day !== '') {
                const yearNo = parseInt(day.slice(0, 4), 10);
                let acc = byYear.get(yearNo);

                if (!acc) {
                    acc = {
                        year: yearNo,
                        sightings: 0,
                        animals: 0,
                        species: 0,
                        tours: 0,
                        first: day,
                        last: day,
                        perDay: Array.from({length: 366}, () => 0),
                        perMonth: Array.from({length: 12}, () => 0),
                        endDay: 365,
                        running: false,
                        partial: false,
                        speciesSet: new Set<number>(),
                        tourSet: new Set<number>()
                    };
                    byYear.set(yearNo, acc);
                }

                acc.sightings++;
                acc.animals += Math.max(0, entry.species_count ?? 0);
                acc.perDay[SightingYearCompare._dayOfYear(day)]++;
                acc.perMonth[parseInt(day.slice(5, 7), 10) - 1]++;

                if (entry.species_id) {
                    acc.speciesSet.add(entry.species_id);
                }

                if (entry.tour_id > 0) {
                    acc.tourSet.add(entry.tour_id);
                }

                if (day < acc.first) {
                    acc.first = day;
                }

                if (day > acc.last) {
                    acc.last = day;
                }
            }
        }

        const currentYear = today.getFullYear();
        const todayDay = SightingYearCompare._dayOfYear(SightingYearCompare._isoDay(today));

        return [...byYear.values()]
        .sort((a, b) => a.year - b.year)
        .map((acc): YearStats => {
            const running = acc.year === currentYear;
            const firstDay = SightingYearCompare._dayOfYear(acc.first);
            const lastDay = SightingYearCompare._dayOfYear(acc.last);

            return {
                year: acc.year,
                sightings: acc.sightings,
                animals: acc.animals,
                species: acc.speciesSet.size,
                tours: acc.tourSet.size,
                first: acc.first,
                last: acc.last,
                perDay: acc.perDay,
                perMonth: acc.perMonth,
                endDay: running ? Math.max(todayDay, lastDay) : 365,
                running,
                // data starts late or ends early (more than a month missing)
                partial: firstDay > 31 || (!running && lastDay < 334)
            };
        });
    }

    protected static _sum(perDay: number[], untilDay: number): number {
        let sum = 0;

        for (let day = 1; day <= Math.min(untilDay, 365); day++) {
            sum += perDay[day] ?? 0;
        }

        return sum;
    }

    protected static _change(now: number, then: number): number | null {
        return then > 0 ? ((now - then) / then) * 100 : null;
    }

    protected static _changeText(change: number): string {
        if (Math.abs(change) < 0.5) {
            return '±0 %';
        }

        const sign = change > 0 ? '+' : '';
        return `${sign}${change.toLocaleString(undefined, {maximumFractionDigits: 0})} %`;
    }

    /**
     * Change pill: green up, red down, grey when (rounded) unchanged.
     * @param {JQuery} parent
     * @param {number} change percent
     * @return {JQuery}
     * @protected
     */
    protected static _changePill(parent: JQuery, change: number): JQuery {
        if (Math.abs(change) < 0.5) {
            return AdminListUi.pill(parent, SightingYearCompare._changeText(change), 'secondary', 'fas fa-equals');
        }

        return AdminListUi.pill(
            parent,
            SightingYearCompare._changeText(change),
            change > 0 ? 'success' : 'danger',
            change > 0 ? 'fas fa-arrow-up' : 'fas fa-arrow-down'
        );
    }

    /**
     * Day of year 1..365 of 'YYYY-MM-DD' on a non-leap calendar, so all
     * years share one axis (Feb 29 is folded onto Feb 28).
     * @param {string} day
     * @return {number}
     * @protected
     */
    protected static _dayOfYear(day: string): number {
        const month = parseInt(day.slice(5, 7), 10) - 1;
        const date = Math.min(parseInt(day.slice(8, 10), 10), month === 1 ? 28 : 31);

        return SightingYearCompare._MONTH_START[month] + date - 1;
    }

    protected static _monthOfDay(dayOfYear: number): number {
        let month = 11;

        while (month > 0 && SightingYearCompare._MONTH_START[month] > dayOfYear) {
            month--;
        }

        return month;
    }

    protected static _dayLabel(dayOfYear: number): string {
        const month = SightingYearCompare._monthOfDay(dayOfYear);
        const date = (dayOfYear - SightingYearCompare._MONTH_START[month]) + 1;

        return `${date}. ${Lang.i().l(SightingYearCompare._MONTH_KEYS[month])}`;
    }

    protected static _day(entry: SightingsEntry): string {
        const day = (entry.date ?? '').slice(0, 10);
        return (/^\d{4}-\d{2}-\d{2}$/u).test(day) ? day : '';
    }

    protected static _isoDay(date: Date): string {
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    }

    protected static _formatDay(day: string): string {
        return `${day.slice(8, 10)}.${day.slice(5, 7)}.${day.slice(0, 4)}`;
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