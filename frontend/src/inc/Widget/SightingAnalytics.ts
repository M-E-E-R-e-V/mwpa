/* global JQuery */
import {ComponentType, Widget2} from 'bambooo';
import * as d3raw from 'd3';
import {BehaviouralStateEntry} from '../Api/BehaviouralStates';
import {EncounterCategorieEntry} from '../Api/EncounterCategories';
import {SightingsEntry} from '../Api/Sightings';
import {SpeciesEntry} from '../Api/Species';
import {Lang} from '../Lang';
import {SightingPopup} from '../Utils/SightingPopup';
import {AdminListUi} from './AdminListUi';

/*
 * Same d3-as-any pattern the rest of the project uses (see
 * CrossSpeciesAnalytics): the d3 typings are not wired into this build.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const d3: any = d3raw;

export type SightingAnalyticsLookups = {
    species: Map<number, SpeciesEntry>;
    behaviours?: Map<number, BehaviouralStateEntry>;
    encounterCategories?: Map<number, EncounterCategorieEntry>;
};

/**
 * One bar of a bar chart.
 */
type AnalyticsBar = {
    label: string;
    value: number;
    tip: string;
    color?: string;
};

/**
 * One heatmap cell.
 */
type AnalyticsCell = {
    row: number;
    col: number;
    value: number;
};

/**
 * Chart card: body to draw into plus the header slot for the key figure.
 */
type AnalyticsCard = {
    body: JQuery;
    figure: JQuery;
};

/**
 * SightingAnalytics
 *
 * "Analytics" tab of the sighting page: key figures plus d3 charts over the
 * loaded sightings (same filter as list and map). Bars are single-hue except
 * species, which keep the colour of their species group (same as the map
 * panel). Every mark has a hover tooltip; the charts redraw when the width
 * of the tab changes.
 */
export class SightingAnalytics extends Widget2 {

    protected static readonly _MONTH_KEYS = [
        'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
        'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
    ];

    protected static readonly _HEIGHT = 220;

    protected static readonly _FALLBACK_COLOR = '#8a99a8';

    protected _lookups: SightingAnalyticsLookups = {species: new Map()};

    protected _data: SightingsEntry[] = [];

    protected _renderedWidth: number = 0;

    protected _statsEl: JQuery;

    protected _tipEl: JQuery;

    protected _emptyEl: JQuery;

    protected _gridEl: JQuery;

    protected _timeline: AnalyticsCard;

    protected _species: AnalyticsCard;

    protected _season: AnalyticsCard;

    protected _dayTime: AnalyticsCard;

    protected _groupSize: AnalyticsCard;

    protected _distance: AnalyticsCard;

    protected _behaviour: AnalyticsCard;

    protected _reaction: AnalyticsCard;

    public constructor(parent: ComponentType) {
        super({
            element: jQuery('<div class="sighting-analytics"/>')
        });

        const root = this._element;
        root.appendTo(SightingAnalytics._asParent(parent));

        this._statsEl = jQuery('<div class="d-flex flex-wrap gap-2 mb-3"/>').appendTo(root);
        this._emptyEl = jQuery('<div class="text-center text-body-secondary py-5 d-none"/>').appendTo(root);
        jQuery('<i class="far fa-chart-bar fa-2x mb-2 d-block opacity-50"/>').appendTo(this._emptyEl);
        jQuery('<span/>').text(Lang.i().l('No sightings under current filter.')).appendTo(this._emptyEl);

        this._gridEl = jQuery('<div class="sighting-analytics-grid"/>').appendTo(root);

        this._timeline = this._card('far fa-calendar-alt', 'Sightings per month', 'Timeline of the filtered period', true);
        this._species = this._card('fas fa-paw', 'Species', 'Share of the sightings');
        this._season = this._card('fas fa-sun', 'Season', 'Sightings per calendar month, all years');
        this._dayTime = this._card('far fa-clock', 'Time of day × month', 'When in the day, when in the year', true);
        this._groupSize = this._card('fas fa-users', 'Group size', 'Animals per sighting');
        this._distance = this._card('fas fa-ruler-horizontal', 'Distance to the coast', 'Nautical miles');
        this._behaviour = this._card('fas fa-swimmer', 'Behaviour', 'Share of the sightings, several per sighting possible');
        this._reaction = this._card('fas fa-ship', 'Reaction to the boat', 'Share of the sightings');

        this._tipEl = jQuery('<div class="mwpa-chart-tip"/>').appendTo(root);

        if (typeof ResizeObserver !== 'undefined') {
            new ResizeObserver(() => {
                const width = this._gridEl.width() ?? 0;

                if (width > 0 && Math.abs(width - this._renderedWidth) > 24) {
                    window.requestAnimationFrame(() => this._render());
                }
            }).observe(root[0]);
        }
    }

    public setLookups(lookups: SightingAnalyticsLookups): void {
        this._lookups = lookups;
    }

    public setData(sightings: SightingsEntry[]): void {
        this._data = sightings;
        this._render();
    }

    public clear(): void {
        this._data = [];
        this._statsEl.empty();
        this._gridEl.find('.sighting-analytics-body').empty();
        this._gridEl.find('.sighting-analytics-figure').empty();
        this._renderedWidth = 0;
    }

    /**
     * Draw everything for the current data.
     * @protected
     */
    protected _render(): void {
        const data = this._data;

        this._statsEl.empty();
        this._gridEl.find('.sighting-analytics-body').empty();
        this._gridEl.find('.sighting-analytics-figure').empty();
        this._tipEl.removeClass('show');

        const empty = data.length === 0;
        this._emptyEl.toggleClass('d-none', !empty);
        this._gridEl.toggleClass('d-none', empty);
        this._statsEl.toggleClass('d-none', empty);

        if (empty) {
            return;
        }

        // hidden tab: nothing to measure — the tab's `shown` handler calls setData again
        const width = this._gridEl.width() ?? 0;

        if (width <= 0) {
            return;
        }

        this._renderedWidth = width;

        this._renderStats(data);
        this._renderTimeline(data);
        this._renderSpecies(data);
        this._renderSeason(data);
        this._renderDayTime(data);
        this._renderGroupSize(data);
        this._renderDistance(data);
        this._renderBehaviour(data);
        this._renderReaction(data);
    }

    /*
     * ---------------------------------------------------------------------------------------------
     * Charts
     * ---------------------------------------------------------------------------------------------
     */

    protected _renderStats(data: SightingsEntry[]): void {
        const lang = Lang.i();
        const species = new Set<number>();
        const tours = new Set<number>();
        const sizes: number[] = [];
        let animals = 0;
        let first = '';
        let last = '';

        for (const entry of data) {
            if (entry.species_id) {
                species.add(entry.species_id);
            }

            if (entry.tour_id > 0) {
                tours.add(entry.tour_id);
            }

            const size = entry.species_count ?? 0;

            if (size > 0) {
                animals += size;
                sizes.push(size);
            }

            const day = SightingAnalytics._day(entry);

            if (day !== '') {
                if (first === '' || day < first) {
                    first = day;
                }

                if (day > last) {
                    last = day;
                }
            }
        }

        const median = d3.median(sizes) ?? 0;
        const perTour = tours.size > 0 ? data.length / tours.size : 0;
        const period = first === ''
            ? '–'
            : `${SightingAnalytics._formatDay(first)} – ${SightingAnalytics._formatDay(last)}`;

        AdminListUi.stat(this._statsEl, 'fas fa-binoculars', data.length.toLocaleString(), 'Sightings', 'text-primary');
        AdminListUi.stat(this._statsEl, 'fas fa-users', animals.toLocaleString(), 'Animals', 'text-warning');
        AdminListUi.stat(this._statsEl, 'fas fa-paw', `${species.size}`, 'Species', 'text-success');
        AdminListUi.stat(this._statsEl, 'fas fa-route', tours.size.toLocaleString(), 'Tours', 'text-info');
        AdminListUi.stat(
            this._statsEl,
            'fas fa-chart-line',
            perTour.toLocaleString(undefined, {maximumFractionDigits: 1}),
            'Sightings per tour'
        ).attr('title', lang.l('Only tours with at least one sighting are counted.'));
        AdminListUi.stat(this._statsEl, 'fas fa-user-friends', median.toLocaleString(), 'Median group size');
        AdminListUi.stat(this._statsEl, 'far fa-calendar', period, 'Period');
    }

    protected _renderTimeline(data: SightingsEntry[]): void {
        const lang = Lang.i();
        const counts = new Map<string, number>();

        for (const entry of data) {
            const month = SightingAnalytics._day(entry).slice(0, 7);

            if (month !== '') {
                counts.set(month, (counts.get(month) ?? 0) + 1);
            }
        }

        if (counts.size === 0) {
            this._noData(this._timeline.body);
            return;
        }

        // continuous month axis — months without sightings are real zeros
        const keys = [...counts.keys()].sort();
        const bars: AnalyticsBar[] = [];
        let [year, month] = keys[0].split('-').map((v) => parseInt(v, 10));
        const [endYear, endMonth] = keys[keys.length - 1].split('-').map((v) => parseInt(v, 10));

        while (year < endYear || (year === endYear && month <= endMonth)) {
            const key = `${year}-${String(month).padStart(2, '0')}`;
            const value = counts.get(key) ?? 0;

            bars.push({
                label: key,
                value,
                tip: `<b>${lang.l(SightingAnalytics._MONTH_KEYS[month - 1])} ${year}</b><br>${value.toLocaleString()} ${lang.l('Sightings')}`
            });

            month++;

            if (month > 12) {
                month = 1;
                year++;
            }
        }

        const peak = bars.reduce((best, bar) => bar.value > best.value ? bar : best, bars[0]);
        const peakMonth = lang.l(SightingAnalytics._MONTH_KEYS[parseInt(peak.label.slice(5), 10) - 1]);
        this._timeline.figure.text(`${lang.l('Peak')}: ${peak.value} (${peakMonth} ${peak.label.slice(0, 4)})`);

        // label January of each year, or every month for short periods
        const tickLabel = (label: string): string => {
            if (bars.length <= 14) {
                return lang.l(SightingAnalytics._MONTH_KEYS[parseInt(label.slice(5), 10) - 1]);
            }

            return label.endsWith('-01') || label === bars[0].label ? label.slice(0, 4) : '';
        };

        this._columns(this._timeline.body, bars, tickLabel);
    }

    protected _renderSpecies(data: SightingsEntry[]): void {
        const lang = Lang.i();
        const counts = new Map<number, number>();

        for (const entry of data) {
            const id = entry.species_id ?? 0;
            counts.set(id, (counts.get(id) ?? 0) + 1);
        }

        const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1]);
        const top = sorted.slice(0, 10);
        const rest = sorted.slice(10).reduce((sum, [, value]) => sum + value, 0);
        const total = data.length;

        const bars: AnalyticsBar[] = top.map(([id, value]) => {
            const specie = this._lookups.species.get(id);
            const label = id === 0 ? lang.l('(no species)') : specie?.name.split(',')[0] ?? `#${id}`;

            return {
                label,
                value,
                color: specie?.species_group?.color || SightingAnalytics._FALLBACK_COLOR,
                tip: SightingAnalytics._shareTip(label, value, total)
            };
        });

        if (rest > 0) {
            const label = `${lang.l('Other')} (${sorted.length - 10})`;
            bars.push({label, value: rest, color: SightingAnalytics._FALLBACK_COLOR, tip: SightingAnalytics._shareTip(label, rest, total)});
        }

        const known = [...counts.keys()].filter((id) => id !== 0).length;
        this._species.figure.text(`${known} ${lang.l('Species')}`);
        this._rows(this._species.body, bars, total);
    }

    protected _renderSeason(data: SightingsEntry[]): void {
        const lang = Lang.i();
        const counts = Array.from({length: 12}, () => 0);
        const years = Array.from({length: 12}, () => new Set<string>());

        for (const entry of data) {
            const day = SightingAnalytics._day(entry);

            if (day !== '') {
                const month = parseInt(day.slice(5, 7), 10) - 1;
                counts[month]++;
                years[month].add(day.slice(0, 4));
            }
        }

        if (counts.every((value) => value === 0)) {
            this._noData(this._season.body);
            return;
        }

        const bars: AnalyticsBar[] = counts.map((value, month) => {
            const name = lang.l(SightingAnalytics._MONTH_KEYS[month]);
            const yearCount = years[month].size;
            const perYear = yearCount > 0 ? value / yearCount : 0;

            return {
                label: name,
                value,
                tip: `<b>${name}</b><br>${value.toLocaleString()} ${lang.l('Sightings')}` +
                    `<br><span class="opacity-75">${lang.l('in')} ${yearCount} ${lang.l('years')} · ` +
                    `Ø ${perYear.toLocaleString(undefined, {maximumFractionDigits: 1})} ${lang.l('per year')}</span>`
            };
        });

        const best = bars.reduce((top, bar) => bar.value > top.value ? bar : top, bars[0]);
        this._season.figure.text(`${lang.l('Most')}: ${best.label}`);
        this._columns(this._season.body, bars, (label) => label);
    }

    protected _renderDayTime(data: SightingsEntry[]): void {
        const lang = Lang.i();
        const grid = new Map<string, number>();
        let minHour = 24;
        let maxHour = -1;

        for (const entry of data) {
            const day = SightingAnalytics._day(entry);
            const hour = SightingAnalytics._hour(entry);

            if (day !== '' && hour >= 0) {
                const key = `${parseInt(day.slice(5, 7), 10) - 1}:${hour}`;
                grid.set(key, (grid.get(key) ?? 0) + 1);
                minHour = Math.min(minHour, hour);
                maxHour = Math.max(maxHour, hour);
            }
        }

        if (maxHour < 0) {
            this._noData(this._dayTime.body);
            return;
        }

        const cells: AnalyticsCell[] = [];

        for (let row = 0; row < 12; row++) {
            for (let hour = minHour; hour <= maxHour; hour++) {
                cells.push({row, col: hour, value: grid.get(`${row}:${hour}`) ?? 0});
            }
        }

        const hourTotals = new Map<number, number>();

        for (const cell of cells) {
            hourTotals.set(cell.col, (hourTotals.get(cell.col) ?? 0) + cell.value);
        }

        const peakHour = [...hourTotals.entries()].reduce((best, item) => item[1] > best[1] ? item : best);
        this._dayTime.figure.text(`${lang.l('Most')}: ${String(peakHour[0]).padStart(2, '0')}:00`);

        this._heatmap(this._dayTime.body, cells, minHour, maxHour);
    }

    protected _renderGroupSize(data: SightingsEntry[]): void {
        const lang = Lang.i();
        const sizes = data.map((entry) => entry.species_count ?? 0).filter((size) => size > 0);

        if (sizes.length === 0) {
            this._noData(this._groupSize.body);
            return;
        }

        const median = d3.median(sizes) ?? 0;
        const mean = d3.mean(sizes) ?? 0;
        const limits = [1, 2, 3, 4, 5, 10, 20, 50, 100];
        const bars = SightingAnalytics._buckets(sizes, limits, (from, to) => {
            if (to === null) {
                return `${from}+`;
            }

            return from === to ? `${from}` : `${from}–${to}`;
        }, lang.l('Sightings'));

        this._groupSize.figure.text(
            `${lang.l('Median')} ${median.toLocaleString()} · Ø ${mean.toLocaleString(undefined, {maximumFractionDigits: 1})}`
        );
        this._columns(this._groupSize.body, bars, (label) => label);
    }

    protected _renderDistance(data: SightingsEntry[]): void {
        const lang = Lang.i();
        const miles = data
        .map((entry) => parseFloat(entry.distance_coast ?? '') || 0)
        .filter((meter) => meter > 0)
        .map((meter) => 0.5399568035 * (meter / 1000));

        if (miles.length === 0) {
            this._noData(this._distance.body);
            return;
        }

        const median = d3.median(miles) ?? 0;
        const limits = [0, 0.5, 1, 2, 3, 4, 5, 7.5, 10, 15];
        const bars = SightingAnalytics._buckets(miles, limits, (from, to) => to === null ? `${from}+` : `${from}–${to}`, lang.l('Sightings'), true);

        this._distance.figure.text(`${lang.l('Median')} ${median.toLocaleString(undefined, {maximumFractionDigits: 1})} mi`);
        this._columns(this._distance.body, bars, (label) => label);
    }

    protected _renderBehaviour(data: SightingsEntry[]): void {
        const behaviours = this._lookups.behaviours;

        if (!behaviours) {
            this._noData(this._behaviour.body);
            return;
        }

        const counts = new Map<string, number>();
        let withBehaviour = 0;

        for (const entry of data) {
            const names = new Set(SightingPopup.parseIdMapNames(
                entry.behaviours ?? '',
                (id): string | undefined => behaviours.get(id)?.name
            ));

            if (names.size > 0) {
                withBehaviour++;
            }

            for (const name of names) {
                counts.set(name, (counts.get(name) ?? 0) + 1);
            }
        }

        this._namedRows(this._behaviour, counts, data.length, withBehaviour);
    }

    protected _renderReaction(data: SightingsEntry[]): void {
        const categories = this._lookups.encounterCategories;

        if (!categories) {
            this._noData(this._reaction.body);
            return;
        }

        const counts = new Map<string, number>();
        let withReaction = 0;

        for (const entry of data) {
            const name = entry.reaction_id ? categories.get(entry.reaction_id)?.name : undefined;

            if (name) {
                withReaction++;
                counts.set(name, (counts.get(name) ?? 0) + 1);
            }
        }

        this._namedRows(this._reaction, counts, data.length, withReaction);
    }

    /**
     * Top-10 row chart of named counts with "recorded in x %" as figure.
     * @param {AnalyticsCard} card
     * @param {Map<string, number>} counts
     * @param {number} total
     * @param {number} recorded
     * @protected
     */
    protected _namedRows(card: AnalyticsCard, counts: Map<string, number>, total: number, recorded: number): void {
        const lang = Lang.i();

        if (counts.size === 0) {
            this._noData(card.body);
            return;
        }

        const bars: AnalyticsBar[] = [...counts.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([name, value]) => {
            const label = lang.l(name);
            return {label, value, tip: SightingAnalytics._shareTip(label, value, total)};
        });

        card.figure.text(`${lang.l('recorded')}: ${Math.round((recorded / total) * 100)} %`);
        this._rows(card.body, bars, total);
    }

    /*
     * ---------------------------------------------------------------------------------------------
     * Drawing
     * ---------------------------------------------------------------------------------------------
     */

    /**
     * Horizontal bars: label left, bar, value + share right.
     * @param {JQuery} el
     * @param {AnalyticsBar[]} bars
     * @param {number} total for the share
     * @protected
     */
    protected _rows(el: JQuery, bars: AnalyticsBar[], total: number): void {
        const width = Math.max(260, el.width() ?? 0);
        const rowH = 22;
        const labelW = Math.min(170, Math.round(width * 0.36));
        const valueW = 78;
        const barW = width - labelW - valueW;
        const height = (bars.length * rowH) + 4;
        const max = Math.max(1, ...bars.map((bar) => bar.value));
        const x = d3.scaleLinear().domain([0, max]).range([0, barW]);

        const svg = d3.select(el[0]).append('svg')
        .attr('width', width)
        .attr('height', height)
        .attr('role', 'img');

        bars.forEach((bar, i) => {
            const y = (i * rowH) + 2;
            const row = svg.append('g').attr('class', 'sighting-analytics-row');
            const label = bar.label.length > 26 ? `${bar.label.slice(0, 25)}…` : bar.label;

            row.append('rect')
            .attr('class', 'sighting-analytics-hit')
            .attr('x', 0)
            .attr('y', y - 1)
            .attr('width', width)
            .attr('height', rowH);

            row.append('text')
            .attr('class', 'sighting-analytics-label')
            .attr('x', labelW - 8)
            .attr('y', y + (rowH / 2))
            .attr('dy', '0.32em')
            .attr('text-anchor', 'end')
            .text(label);

            row.append('path')
            .attr('d', SightingAnalytics._barPath(labelW, y + 4, Math.max(2, x(bar.value)), rowH - 10, 'h'))
            .style('fill', bar.color ?? 'var(--mwpa-chart-primary)');

            row.append('text')
            .attr('class', 'sighting-analytics-value')
            .attr('x', labelW + Math.max(2, x(bar.value)) + 6)
            .attr('y', y + (rowH / 2))
            .attr('dy', '0.32em')
            .text(`${bar.value.toLocaleString()} · ${SightingAnalytics._percent(bar.value, total)}`);

            this._bindTip(row, bar.tip);
        });
    }

    /**
     * Vertical bars on a band axis.
     * @param {JQuery} el
     * @param {AnalyticsBar[]} bars
     * @param {Function} tickLabel '' hides the tick
     * @protected
     */
    protected _columns(el: JQuery, bars: AnalyticsBar[], tickLabel: (label: string) => string): void {
        const width = Math.max(260, el.width() ?? 0);
        const height = SightingAnalytics._HEIGHT;
        const margin = {top: 8, right: 4, bottom: 24, left: 40};
        const innerW = width - margin.left - margin.right;
        const innerH = height - margin.top - margin.bottom;
        const max = Math.max(1, ...bars.map((bar) => bar.value));

        const x = d3.scaleBand()
        .domain(bars.map((bar) => bar.label))
        .range([0, innerW])
        .paddingInner(bars.length > 40 ? 0.1 : 0.2);
        const y = d3.scaleLinear().domain([0, max]).nice().range([innerH, 0]);

        const svg = d3.select(el[0]).append('svg')
        .attr('width', width)
        .attr('height', height)
        .attr('role', 'img');
        const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

        // recessive grid + y axis labels
        const ticks = y.ticks(4);

        g.selectAll('line.sighting-analytics-grid-line').data(ticks).enter().append('line')
        .attr('class', 'sighting-analytics-grid-line')
        .attr('x1', 0)
        .attr('x2', innerW)
        .attr('y1', (t: number) => y(t))
        .attr('y2', (t: number) => y(t));

        g.selectAll('text.sighting-analytics-axis-y').data(ticks).enter().append('text')
        .attr('class', 'sighting-analytics-axis')
        .attr('x', -6)
        .attr('y', (t: number) => y(t))
        .attr('dy', '0.32em')
        .attr('text-anchor', 'end')
        .text((t: number) => t.toLocaleString());

        const step = x.step();

        bars.forEach((bar) => {
            const left = x(bar.label) ?? 0;
            const col = g.append('g');

            col.append('rect')
            .attr('class', 'sighting-analytics-hit')
            .attr('x', left - ((step - x.bandwidth()) / 2))
            .attr('y', 0)
            .attr('width', step)
            .attr('height', innerH);

            if (bar.value > 0) {
                col.append('path')
                .attr('d', SightingAnalytics._barPath(left, y(bar.value), x.bandwidth(), innerH - y(bar.value), 'v'))
                .style('fill', bar.color ?? 'var(--mwpa-chart-primary)');
            }

            const tick = tickLabel(bar.label);

            if (tick !== '') {
                col.append('text')
                .attr('class', 'sighting-analytics-axis')
                .attr('x', left + (x.bandwidth() / 2))
                .attr('y', innerH + 16)
                .attr('text-anchor', bars.length > 14 ? 'start' : 'middle')
                .text(tick);
            }

            this._bindTip(col, bar.tip);
        });

        g.append('line')
        .attr('class', 'sighting-analytics-baseline')
        .attr('x1', 0)
        .attr('x2', innerW)
        .attr('y1', innerH)
        .attr('y2', innerH);
    }

    /**
     * Month (rows) × hour (columns) heatmap, single hue by opacity.
     * @param {JQuery} el
     * @param {AnalyticsCell[]} cells
     * @param {number} minHour
     * @param {number} maxHour
     * @protected
     */
    protected _heatmap(el: JQuery, cells: AnalyticsCell[], minHour: number, maxHour: number): void {
        const lang = Lang.i();
        const width = Math.max(260, el.width() ?? 0);
        const margin = {top: 4, right: 4, bottom: 22, left: 40};
        const hours = (maxHour - minHour) + 1;
        const innerW = width - margin.left - margin.right;
        const cellW = innerW / hours;
        const cellH = 18;
        const innerH = cellH * 12;
        const max = Math.max(1, ...cells.map((cell) => cell.value));
        const opacity = d3.scaleSqrt().domain([0, max]).range([0.12, 1]);

        const svg = d3.select(el[0]).append('svg')
        .attr('width', width)
        .attr('height', innerH + margin.top + margin.bottom)
        .attr('role', 'img');
        const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

        for (const cell of cells) {
            const rect = g.append('rect')
            .attr('x', ((cell.col - minHour) * cellW) + 1)
            .attr('y', (cell.row * cellH) + 1)
            .attr('width', Math.max(1, cellW - 2))
            .attr('height', cellH - 2)
            .attr('rx', 2);

            if (cell.value === 0) {
                rect.attr('class', 'sighting-analytics-cell-empty');
            } else {
                rect.style('fill', 'var(--mwpa-chart-primary)').style('fill-opacity', opacity(cell.value));
            }

            const hour = String(cell.col).padStart(2, '0');

            this._bindTip(
                rect,
                `<b>${lang.l(SightingAnalytics._MONTH_KEYS[cell.row])}, ${hour}:00–${hour}:59</b><br>` +
                `${cell.value.toLocaleString()} ${lang.l('Sightings')}`
            );
        }

        SightingAnalytics._MONTH_KEYS.forEach((key, row) => {
            g.append('text')
            .attr('class', 'sighting-analytics-axis')
            .attr('x', -6)
            .attr('y', (row * cellH) + (cellH / 2))
            .attr('dy', '0.32em')
            .attr('text-anchor', 'end')
            .text(lang.l(key));
        });

        const every = cellW < 22 ? 2 : 1;

        for (let hour = minHour; hour <= maxHour; hour += every) {
            g.append('text')
            .attr('class', 'sighting-analytics-axis')
            .attr('x', ((hour - minHour) * cellW) + (cellW / 2))
            .attr('y', innerH + 14)
            .attr('text-anchor', 'middle')
            .text(String(hour).padStart(2, '0'));
        }
    }

    /**
     * Show the shared tooltip while the pointer is over the element.
     * @param {d3.Selection} target d3 selection
     * @param {string} html
     * @protected
     */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    protected _bindTip(target: any, html: string): void {
        target
        .on('mouseenter', () => {
            this._tipEl.html(html).addClass('show');
        })
        .on('mousemove', (event: MouseEvent) => {
            const box = this._element[0].getBoundingClientRect();
            const tipW = this._tipEl.outerWidth() ?? 0;
            let left = event.clientX - box.left + 14;

            if (left + tipW > box.width) {
                left = event.clientX - box.left - tipW - 14;
            }

            this._tipEl.css({left: Math.max(0, left), top: event.clientY - box.top + 14});
        })
        .on('mouseleave', () => {
            this._tipEl.removeClass('show');
        });
    }

    /**
     * Chart card in the grid.
     * @param {string} icon
     * @param {string} title English source text
     * @param {string} hint English source text
     * @param {boolean} wide spans both columns
     * @return {AnalyticsCard}
     * @protected
     */
    protected _card(icon: string, title: string, hint: string, wide: boolean = false): AnalyticsCard {
        const lang = Lang.i();
        const card = jQuery('<div class="sighting-analytics-card"/>').appendTo(this._gridEl);

        if (wide) {
            card.addClass('sighting-analytics-wide');
        }

        const head = jQuery('<div class="d-flex align-items-start gap-2 mb-2"/>').appendTo(card);
        jQuery('<i class="text-body-secondary small mt-1"/>').addClass(icon).appendTo(head);
        const titles = jQuery('<div class="flex-grow-1 lh-sm"/>').appendTo(head);
        jQuery('<div class="fw-semibold small text-uppercase text-body-secondary"/>').text(lang.l(title)).appendTo(titles);
        jQuery('<div class="small text-body-tertiary"/>').text(lang.l(hint)).appendTo(titles);
        const figure = jQuery('<div class="sighting-analytics-figure small fw-semibold text-nowrap"/>').appendTo(head);
        const body = jQuery('<div class="sighting-analytics-body"/>').appendTo(card);

        return {body, figure};
    }

    protected _noData(el: JQuery): void {
        jQuery('<div class="text-center text-body-tertiary small py-5"/>').text(Lang.i().l('No data')).appendTo(el);
    }

    /*
     * ---------------------------------------------------------------------------------------------
     * Helpers
     * ---------------------------------------------------------------------------------------------
     */

    /**
     * Count values into ranges [limit[i], limit[i+1]); the last one is open.
     * @param {number[]} values
     * @param {number[]} limits ascending lower bounds
     * @param {Function} label (from, to|null) => label
     * @param {string} unit tooltip unit
     * @param {boolean} continuous upper bound exclusive (else integer ranges)
     * @return {AnalyticsBar[]}
     * @protected
     */
    protected static _buckets(
        values: number[],
        limits: number[],
        label: (from: number, to: number | null) => string,
        unit: string,
        continuous: boolean = false
    ): AnalyticsBar[] {
        const counts = limits.map(() => 0);

        for (const value of values) {
            let index = limits.length - 1;

            while (index > 0 && value < limits[index]) {
                index--;
            }

            counts[index]++;
        }

        // drop empty ranges at the open end
        let last = counts.length - 1;

        while (last > 0 && counts[last] === 0) {
            last--;
        }

        const bars: AnalyticsBar[] = [];

        for (let i = 0; i <= last; i++) {
            let to: number | null = null;

            if (i < limits.length - 1) {
                to = continuous ? limits[i + 1] : limits[i + 1] - 1;
            }

            const text = label(limits[i], to);

            bars.push({
                label: text,
                value: counts[i],
                tip: `<b>${text}</b><br>${counts[i].toLocaleString()} ${unit} · ${SightingAnalytics._percent(counts[i], values.length)}`
            });
        }

        return bars;
    }

    /**
     * SVG path of a bar with rounded data end (4px) and square baseline.
     * @param {number} x
     * @param {number} y
     * @param {number} w
     * @param {number} h
     * @param {'h'|'v'} orientation h: grows to the right, v: grows upwards
     * @return {string}
     * @protected
     */
    protected static _barPath(x: number, y: number, w: number, h: number, orientation: 'h' | 'v'): string {
        if (orientation === 'h') {
            const r = Math.min(4, w, h / 2);
            return `M${x},${y}H${x + w - r}Q${x + w},${y} ${x + w},${y + r}V${y + h - r}Q${x + w},${y + h} ${x + w - r},${y + h}H${x}Z`;
        }

        const r = Math.min(4, h, w / 2);
        return `M${x},${y + h}V${y + r}Q${x},${y} ${x + r},${y}H${x + w - r}Q${x + w},${y} ${x + w},${y + r}V${y + h}Z`;
    }

    protected static _percent(value: number, total: number): string {
        if (total <= 0) {
            return '0 %';
        }

        const share = (value / total) * 100;
        return `${share.toLocaleString(undefined, {maximumFractionDigits: share < 10 ? 1 : 0})} %`;
    }

    protected static _shareTip(label: string, value: number, total: number): string {
        return `<b>${AdminListUi.escape(label)}</b><br>${value.toLocaleString()} ${Lang.i().l('Sightings')} · ` +
            `${SightingAnalytics._percent(value, total)}`;
    }

    /**
     * Sighting day as 'YYYY-MM-DD' ('' when missing).
     * @param {SightingsEntry} entry
     * @return {string}
     * @protected
     */
    protected static _day(entry: SightingsEntry): string {
        const day = (entry.date ?? '').slice(0, 10);
        return (/^\d{4}-\d{2}-\d{2}$/u).test(day) ? day : '';
    }

    protected static _formatDay(day: string): string {
        return `${day.slice(8, 10)}.${day.slice(5, 7)}.${day.slice(0, 4)}`;
    }

    /**
     * Hour of the sighting (start of the encounter, else tour start), -1 when unknown.
     * @param {SightingsEntry} entry
     * @return {number}
     * @protected
     */
    protected static _hour(entry: SightingsEntry): number {
        const match = (/^(\d{1,2}):/u).exec(entry.duration_from || entry.tour_start || '');
        const hour = match ? parseInt(match[1], 10) : -1;
        return hour >= 0 && hour < 24 ? hour : -1;
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