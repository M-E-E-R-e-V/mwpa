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
 * Per-chart spec passed to {@link MetricCharts._chartCard}.
 * - `xLabel` / `yLabel` end up under / left of the plot inside the SVG.
 * - `description` feeds a click-popover behind the (i) icon next to the title — HTML allowed.
 */
type ChartCardSpec = {
    title: string;
    xLabel: string;
    yLabel: string;
    description: string;
};

/**
 * What {@link MetricCharts._chartCard} returns: the plot container plus the
 * axis labels, so render methods can paint them into the SVG without the
 * caller re-passing the same strings.
 */
type ChartHandle = {
    target: JQuery;
    xLabel: string;
    yLabel: string;
};

/**
 * Analytics panel for the OceanFishingMap.
 *
 * Renders a responsive grid of d3 charts over the filtered sighting set.
 * Every card carries:
 *   - axis labels rendered inside the SVG (units + variable name),
 *   - an (i) icon next to the title that opens a Bootstrap popover with
 *     a longer explanation of what the chart shows and how to read it.
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
     * Per-chart handles, populated in the constructor and reused on
     * every {@link setData}. Keyed by a stable id so the rendering
     * methods can address them directly.
     * @protected
     */
    protected _charts: Record<string, ChartHandle> = {};

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

        const grid = jQuery('<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:12px;padding:8px;"/>').appendTo(root);

        // ---- Histograms — ocean ----
        this._charts.histChl = MetricCharts._chartCard(grid, {
            title: 'Chl-a distribution (mg/m³)',
            xLabel: 'Chl-a concentration [mg/m³]',
            yLabel: 'Number of sightings',
            description:
                '<b>What:</b> Histogram of <i>chlorophyll-a</i> concentration sampled at each sighting (daily mean).<br>'
                + '<b>X axis:</b> chlorophyll-a in milligrams per cubic metre — higher = more phytoplankton.<br>'
                + '<b>Y axis:</b> number of sightings whose chl-a value falls into that bin (bin width is auto-picked, 20 bins).<br>'
                + '<b>Read:</b> the bulk of sightings sits at low values (open ocean is typically &lt; 0.5 mg/m³); a tail to the right indicates productive water near coastal upwelling.<br>'
                + '<b>Source:</b> NOAA CoastWatch ERDDAP, surface chl-a.'
        });
        this._charts.histSst = MetricCharts._chartCard(grid, {
            title: 'SST distribution (°C)',
            xLabel: 'Sea-surface temperature [°C]',
            yLabel: 'Number of sightings',
            description:
                '<b>What:</b> Histogram of <i>sea-surface temperature</i> at each sighting (daily mean).<br>'
                + '<b>X axis:</b> SST in degrees Celsius.<br>'
                + '<b>Y axis:</b> number of sightings per temperature bin.<br>'
                + '<b>Read:</b> shows the thermal envelope animals were encountered in. Compare year-to-year to spot anomalies.<br>'
                + '<b>Source:</b> ERDDAP SST product.'
        });
        this._charts.histSal = MetricCharts._chartCard(grid, {
            title: 'Salinity distribution (PSU)',
            xLabel: 'Sea-surface salinity [PSU]',
            yLabel: 'Number of sightings',
            description:
                '<b>What:</b> Histogram of <i>sea-surface salinity</i> in Practical Salinity Units.<br>'
                + '<b>X axis:</b> salinity (open Atlantic is typically 36.5 – 37 PSU).<br>'
                + '<b>Y axis:</b> number of sightings per bin.<br>'
                + '<b>Read:</b> a tight peak = consistent oceanic water mass. Spread indicates mixing with fresher / saltier inputs.'
        });
        this._charts.histSla = MetricCharts._chartCard(grid, {
            title: 'Sea level anomaly distribution (cm)',
            xLabel: 'Sea-level anomaly [cm]',
            yLabel: 'Number of sightings',
            description:
                '<b>What:</b> Histogram of <i>sea-level anomaly</i> (deviation from the multi-year mean).<br>'
                + '<b>X axis:</b> anomaly in centimetres. Positive = warmer / anticyclonic eddy (downwelling), negative = cyclonic eddy (upwelling).<br>'
                + '<b>Y axis:</b> number of sightings per bin.<br>'
                + '<b>Read:</b> useful proxy for mesoscale circulation features that aggregate prey.'
        });
        this._charts.histCur = MetricCharts._chartCard(grid, {
            title: 'Current speed distribution (m/s)',
            xLabel: 'Surface current speed [m/s]',
            yLabel: 'Number of sightings',
            description:
                '<b>What:</b> Histogram of <i>surface current speed</i> at each sighting (daily mean magnitude).<br>'
                + '<b>X axis:</b> speed in metres per second (1 m/s ≈ 2 knots).<br>'
                + '<b>Y axis:</b> number of sightings per bin.<br>'
                + '<b>Read:</b> stronger currents often mark frontal zones where productivity concentrates.'
        });
        this._charts.histDepth = MetricCharts._chartCard(grid, {
            title: 'Depth distribution (m)',
            xLabel: 'Water depth [m, positive = depth]',
            yLabel: 'Number of sightings',
            description:
                '<b>What:</b> Histogram of <i>sea-floor depth</i> directly under each sighting.<br>'
                + '<b>X axis:</b> depth in metres below sea level (single source, EMODnet Bathymetry).<br>'
                + '<b>Y axis:</b> number of sightings per depth bin.<br>'
                + '<b>Read:</b> shows whether species favour shelf (&lt; 200 m), slope (200 – 1000 m) or pelagic (&gt; 1000 m) habitats.'
        });

        // ---- Histograms — weather ----
        this._charts.histAir = MetricCharts._chartCard(grid, {
            title: 'Air temperature distribution (°C)',
            xLabel: 'Air temperature at 2 m [°C]',
            yLabel: 'Number of sightings',
            description:
                '<b>What:</b> Histogram of <i>air temperature</i> at the sighting location (Open-Meteo, 2 m above sea level).<br>'
                + '<b>X axis:</b> temperature in °C.<br>'
                + '<b>Y axis:</b> number of sightings per bin.<br>'
                + '<b>Read:</b> useful sanity-check for seasonality / observer comfort. Compare with SST to spot air-sea decoupling.'
        });
        this._charts.histUv = MetricCharts._chartCard(grid, {
            title: 'UV index distribution',
            xLabel: 'UV index (0 – 11+)',
            yLabel: 'Number of sightings',
            description:
                '<b>What:</b> Histogram of the <i>UV index</i> during the sighting (daily mean).<br>'
                + '<b>X axis:</b> WHO UV index — 0 = none, 3 = moderate, 8 = very high, 11+ = extreme.<br>'
                + '<b>Y axis:</b> number of sightings per bin.<br>'
                + '<b>Read:</b> proxy for clear-sky conditions and observer visibility — high UV days correlate with better detection probability.'
        });
        this._charts.histWave = MetricCharts._chartCard(grid, {
            title: 'Wave height distribution (m)',
            xLabel: 'Significant wave height [m]',
            yLabel: 'Number of sightings',
            description:
                '<b>What:</b> Histogram of <i>significant wave height</i> (Hs) — the mean of the highest 1/3 of waves.<br>'
                + '<b>X axis:</b> wave height in metres.<br>'
                + '<b>Y axis:</b> number of sightings per bin.<br>'
                + '<b>Read:</b> low Hs = calm sea = blow-detection effective. Sightings drop off above ~2 m because sea state hides cues.'
        });
        this._charts.histWavePer = MetricCharts._chartCard(grid, {
            title: 'Wave period distribution (s)',
            xLabel: 'Mean wave period [s]',
            yLabel: 'Number of sightings',
            description:
                '<b>What:</b> Histogram of the <i>mean wave period</i> (T) — average time between wave crests.<br>'
                + '<b>X axis:</b> period in seconds. Short = local wind sea, long (&gt; 10 s) = distant swell.<br>'
                + '<b>Y axis:</b> number of sightings per bin.<br>'
                + '<b>Read:</b> pair with wave height to characterise the sea state regime under which animals were detected.'
        });

        // ---- Histograms — fishing ----
        this._charts.histFish = MetricCharts._chartCard(grid, {
            title: 'Fishing hours distribution (h/day, 25 km)',
            xLabel: 'AIS fishing hours per day within 25 km',
            yLabel: 'Number of sightings',
            description:
                '<b>What:</b> Histogram of <i>commercial fishing effort</i> in a 25 km radius around each sighting on the sighting date.<br>'
                + '<b>X axis:</b> apparent fishing hours per day, from Global Fishing Watch.<br>'
                + '<b>Y axis:</b> number of sightings per bin.<br>'
                + '<b>Read:</b> a heavy left tail = most sightings happen under low fishing pressure; a right tail suggests co-occurrence with fishing activity.'
        });

        // ---- Relationships ----
        this._charts.scatter = MetricCharts._chartCard(grid, {
            title: 'Chl-a vs Fishing effort',
            xLabel: 'Chl-a concentration [mg/m³]',
            yLabel: 'Fishing hours per day, 25 km',
            description:
                '<b>What:</b> Scatter of <i>fishing effort</i> versus <i>chlorophyll-a</i> for every sighting that has both values.<br>'
                + '<b>X axis:</b> chl-a (mg/m³) — productivity proxy.<br>'
                + '<b>Y axis:</b> AIS fishing hours per day within 25 km — fishing pressure.<br>'
                + '<b>Read:</b> a positive slope is expected because fishing fleets follow productive water. The scatter quantifies how strongly that overlap shows up in the sighting set.'
        });

        // ---- Seasonality ----
        this._charts.monthlyChl = MetricCharts._chartCard(grid, {
            title: 'Chl-a — monthly mean',
            xLabel: 'Month (sighting date)',
            yLabel: 'Mean chlorophyll-a [mg/m³]',
            description:
                '<b>What:</b> Monthly mean of <i>chlorophyll-a</i> across all sightings in that month.<br>'
                + '<b>X axis:</b> time (sighting date, grouped per calendar month).<br>'
                + '<b>Y axis:</b> mean chl-a (mg/m³) for the month.<br>'
                + '<b>Read:</b> highlights the seasonal productivity cycle (spring bloom, summer minimum). Caveat: depends on the sighting cadence — gaps in sampling cause gaps in the line.'
        });
        this._charts.monthlyCount = MetricCharts._chartCard(grid, {
            title: 'Sightings per month',
            xLabel: 'Month (sighting date)',
            yLabel: 'Number of sightings',
            description:
                '<b>What:</b> Count of sightings per calendar month.<br>'
                + '<b>X axis:</b> time (calendar month).<br>'
                + '<b>Y axis:</b> number of sightings recorded that month.<br>'
                + '<b>Read:</b> survey effort proxy — peaks usually mean more tours, not necessarily more animals. Combine with effort-normalised metrics for inference.'
        });

        // ---- Categorical breakdowns ----
        this._charts.species = MetricCharts._chartCard(grid, {
            title: 'Top species',
            xLabel: 'Number of sightings',
            yLabel: 'Species',
            description:
                '<b>What:</b> Top 8 <i>species</i> in the current filter, sorted by sighting count.<br>'
                + '<b>X axis:</b> number of sightings.<br>'
                + '<b>Y axis:</b> species name (free text from the species master list).<br>'
                + '<b>Read:</b> dominance of a few species is normal — the long tail is hidden (cap at 8 to keep the chart legible).'
        });
        this._charts.gear = MetricCharts._chartCard(grid, {
            title: 'Top fishing gear types',
            xLabel: 'Number of sightings',
            yLabel: 'Gear type',
            description:
                '<b>What:</b> Top 8 <i>fishing gear types</i> seen in the GFW vessel breakdown around each sighting, sorted by sighting count.<br>'
                + '<b>X axis:</b> number of sightings.<br>'
                + '<b>Y axis:</b> gear type (Global Fishing Watch taxonomy: drifting longlines, purse seines, …).<br>'
                + '<b>Read:</b> which fishery is most often in the vicinity. Empty when GFW returned no vessels for the filtered set.'
        });
        this._charts.flag = MetricCharts._chartCard(grid, {
            title: 'Top vessel flags',
            xLabel: 'Number of sightings',
            yLabel: 'Flag state',
            description:
                '<b>What:</b> Top 8 <i>vessel flag states</i> in the GFW breakdown around each sighting.<br>'
                + '<b>X axis:</b> number of sightings.<br>'
                + '<b>Y axis:</b> ISO flag code (ESP, MAR, PRT, …).<br>'
                + '<b>Read:</b> distribution of fleets operating around the observation area.'
        });
    }

    /**
     * Choose which metric the seasonality time-series charts against.
     * Histograms and breakdowns are independent of this setting.
     */
    public setPrimaryMetric(def: ChartDef): void {
        this._primary = def;
    }

    public setData(rows: SightingEnvironmentEntry[]): void {
        for (const handle of Object.values(this._charts)) {
            handle.target.empty();
        }

        if (rows.length === 0) {
            this._statusEl.text('No sightings under current filter.');
            return;
        }

        this._statusEl.text(`${rows.length} sightings analysed.`);

        // Ocean
        this._renderHistogramOf(this._charts.histChl,   rows, (r) => r.chl_a_mg_m3_day,         '#69b3a2');
        this._renderHistogramOf(this._charts.histSst,   rows, (r) => r.sst_c_day,               '#e76f51');
        this._renderHistogramOf(this._charts.histSal,   rows, (r) => r.salinity_psu_day,        '#264653');
        this._renderHistogramOf(this._charts.histSla,   rows, (r) => r.sla_cm_day,              '#4a90c2');
        this._renderHistogramOf(this._charts.histCur,   rows, (r) => r.current_speed_m_s_day,   '#1d6f8a');
        this._renderHistogramOf(this._charts.histDepth, rows, (r) => r.depth_m,                 '#6c757d');

        // Weather
        this._renderHistogramOf(this._charts.histAir,     rows, (r) => r.air_temperature_c_day, '#e9c46a');
        this._renderHistogramOf(this._charts.histUv,      rows, (r) => r.uv_index_day,          '#d4a017');
        this._renderHistogramOf(this._charts.histWave,    rows, (r) => r.wave_height_m_day,     '#2a9d8f');
        this._renderHistogramOf(this._charts.histWavePer, rows, (r) => r.wave_period_s_day,     '#52b69a');

        // Fishing
        this._renderHistogramOf(this._charts.histFish,  rows, (r) => r.fishing_hours_day_25km,  '#f4a261');

        this._renderScatter(rows);

        this._renderTimeSeries(this._charts.monthlyChl,   rows, (r) => this._primary.accessor(r), 'mean');
        this._renderTimeSeries(this._charts.monthlyCount, rows, () => 1,                          'count');

        this._renderTopBar(this._charts.species, rows, (r) => r.species_name,   '#2c7fb8');
        this._renderTopBar(this._charts.gear,    rows, (r) => r.top_gear_type,  '#8e7cc3');
        this._renderTopBar(this._charts.flag,    rows, (r) => r.top_flag,       '#c14953');
    }

    /**
     * Build one chart card with title + info popover + plot area.
     * The info icon uses Bootstrap 4's popover plugin (already loaded via
     * AdminLTE); click toggles, click outside dismisses.
     * @protected
     */
    protected static _chartCard(grid: JQuery, spec: ChartCardSpec): ChartHandle {
        const card = jQuery('<div style="background:#fff;border:1px solid #dee2e6;border-radius:4px;padding:6px;"/>').appendTo(grid);

        const head = jQuery('<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px;gap:6px;"/>').appendTo(card);
        jQuery(`<span style="font-weight:600;font-size:0.85rem;">${escapeHtml(spec.title)}</span>`).appendTo(head);
        const infoBtn = jQuery(
            '<button type="button" class="btn btn-link btn-sm metric-chart-info" '
            + 'style="padding:0 4px;color:#2c7fb8;text-decoration:none;line-height:1;" '
            + 'title="Click for details">'
            + '<i class="fa fa-info-circle"/></button>'
        ).appendTo(head);

        // Bootstrap 4 popover. `sanitize:false` because we deliberately
        // feed HTML strings we control; titles still go through escapeHtml.
        infoBtn.popover({
            html: true,
            sanitize: false,
            trigger: 'click',
            placement: 'top',
            container: 'body',
            title: spec.title,
            content: `<div style="font-size:0.8rem;line-height:1.4;max-width:340px;">${spec.description}</div>`
        });

        // Auto-dismiss any open popover when the user clicks anywhere
        // outside it (default Bootstrap behaviour is to keep them open).
        infoBtn.on('shown.bs.popover', () => {
            jQuery(document).one('click.metric-chart-info', (ev) => {
                if (!jQuery(ev.target).closest('.popover, .metric-chart-info').length) {
                    infoBtn.popover('hide');
                }
            });
        });

        const target = jQuery('<div style="height:200px;"/>').appendTo(card);
        return {target, xLabel: spec.xLabel, yLabel: spec.yLabel};
    }

    /**
     * Paint axis labels inside the SVG. `xLabel` lands below the X axis,
     * `yLabel` is rotated -90° on the left.
     * @protected
     */
    protected static _drawAxisLabels(
        svg: any,
        containerWidth: number,
        containerHeight: number,
        margin: {top: number; right: number; bottom: number; left: number;},
        xLabel: string,
        yLabel: string
    ): void {
        svg.append('text')
            .attr('text-anchor', 'middle')
            .attr('x', margin.left + (containerWidth - margin.left - margin.right) / 2)
            .attr('y', containerHeight - 4)
            .attr('font-size', '0.7rem')
            .attr('fill', '#555')
            .text(xLabel);

        svg.append('text')
            .attr('text-anchor', 'middle')
            .attr('transform',
                `translate(11,${margin.top + (containerHeight - margin.top - margin.bottom) / 2}) rotate(-90)`)
            .attr('font-size', '0.7rem')
            .attr('fill', '#555')
            .text(yLabel);
    }

    /**
     * Generic histogram into a target container, using an accessor
     * that may return undefined (undefined / non-finite rows are
     * dropped before plotting).
     * @protected
     */
    protected _renderHistogramOf(
        handle: ChartHandle,
        rows: SightingEnvironmentEntry[],
        accessor: MetricAccessor,
        color: string
    ): void {
        const values: number[] = [];
        for (const r of rows) {
            const v = accessor(r);
            if (typeof v === 'number' && Number.isFinite(v)) {
                values.push(v);
            }
        }

        if (values.length === 0) {
            jQuery('<div style="color:#888;font-size:0.8rem;">No values yet.</div>').appendTo(handle.target);
            return;
        }

        const containerWidth = handle.target.width() ?? 280;
        const containerHeight = handle.target.height() ?? 200;
        const margin = {top: 6, right: 10, bottom: 42, left: 52};
        const width = containerWidth - margin.left - margin.right;
        const height = containerHeight - margin.top - margin.bottom;

        const svg = d3.select(handle.target[0])
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
        .attr('fill', color);

        g.append('g').attr('transform', `translate(0,${height})`).call(d3.axisBottom(x).ticks(5));
        g.append('g').call(d3.axisLeft(y).ticks(4));

        MetricCharts._drawAxisLabels(svg, containerWidth, containerHeight, margin, handle.xLabel, handle.yLabel);
    }

    /**
     * @protected
     */
    protected _renderScatter(rows: SightingEnvironmentEntry[]): void {
        const handle = this._charts.scatter;
        const pairs: ScatterPair[] = [];
        for (const r of rows) {
            const chl = r.chl_a_mg_m3_day;
            const fish = r.fishing_hours_day_25km;
            if (typeof chl === 'number' && Number.isFinite(chl) && typeof fish === 'number' && Number.isFinite(fish)) {
                pairs.push({chl, fish});
            }
        }

        if (pairs.length === 0) {
            jQuery('<div style="color:#888;font-size:0.8rem;">No paired chl-a + fishing values yet.</div>').appendTo(handle.target);
            return;
        }

        const containerWidth = handle.target.width() ?? 280;
        const containerHeight = handle.target.height() ?? 200;
        const margin = {top: 6, right: 10, bottom: 42, left: 52};
        const width = containerWidth - margin.left - margin.right;
        const height = containerHeight - margin.top - margin.bottom;

        const svg = d3.select(handle.target[0])
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

        MetricCharts._drawAxisLabels(svg, containerWidth, containerHeight, margin, handle.xLabel, handle.yLabel);
    }

    /**
     * Monthly aggregate time series. `mode='mean'` averages the
     * accessor over each month; `mode='count'` ignores the value and
     * just counts non-null rows — handy for "sightings per month".
     * @protected
     */
    protected _renderTimeSeries(
        handle: ChartHandle,
        rows: SightingEnvironmentEntry[],
        accessor: MetricAccessor,
        mode: 'mean' | 'count'
    ): void {
        const monthly = new Map<string, number[]>();

        for (const r of rows) {
            const datePart = (r.date ?? '').split(' ')[0];
            if (datePart.length < 7) {
                continue;
            }
            const monthKey = datePart.slice(0, 7);

            if (mode === 'count') {
                const value = accessor(r);
                // count: include every row that has any value or even just a date
                const bucket = monthly.get(monthKey);
                if (bucket) {
                    bucket.push(typeof value === 'number' && Number.isFinite(value) ? value : 1);
                } else {
                    monthly.set(monthKey, [1]);
                }
                continue;
            }

            const value = accessor(r);
            if (typeof value === 'number' && Number.isFinite(value)) {
                const bucket = monthly.get(monthKey);
                if (bucket) {
                    bucket.push(value);
                } else {
                    monthly.set(monthKey, [value]);
                }
            }
        }

        if (monthly.size === 0) {
            jQuery('<div style="color:#888;font-size:0.8rem;">No dated values yet.</div>').appendTo(handle.target);
            return;
        }

        const points: SeriesPoint[] = Array.from(monthly.entries())
        .map(([k, vs]): SeriesPoint => ({
            date: new Date(`${k}-15T00:00:00Z`),
            mean: mode === 'count' ? vs.length : vs.reduce((a, b) => a + b, 0) / vs.length
        }))
        .sort((a, b) => a.date.getTime() - b.date.getTime());

        const containerWidth = handle.target.width() ?? 280;
        const containerHeight = handle.target.height() ?? 200;
        const margin = {top: 6, right: 10, bottom: 42, left: 52};
        const width = containerWidth - margin.left - margin.right;
        const height = containerHeight - margin.top - margin.bottom;

        const svg = d3.select(handle.target[0])
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

        const stroke = mode === 'count' ? '#1a936f' : '#2c7fb8';

        g.append('path')
        .datum(points)
        .attr('fill', 'none')
        .attr('stroke', stroke)
        .attr('stroke-width', 1.5)
        .attr('d', line);

        g.selectAll('circle')
        .data(points)
        .enter()
        .append('circle')
        .attr('cx', (d: SeriesPoint): number => x(d.date))
        .attr('cy', (d: SeriesPoint): number => y(d.mean))
        .attr('r', 2.5)
        .attr('fill', stroke);

        g.append('g').attr('transform', `translate(0,${height})`).call(d3.axisBottom(x).ticks(4));
        g.append('g').call(d3.axisLeft(y).ticks(4));

        MetricCharts._drawAxisLabels(svg, containerWidth, containerHeight, margin, handle.xLabel, handle.yLabel);
    }

    /**
     * Top-N horizontal bar chart over a categorical accessor. Empty /
     * undefined labels are dropped; the rest is sorted DESC by count
     * and capped at 8 rows so the chart stays readable.
     * @protected
     */
    protected _renderTopBar(
        handle: ChartHandle,
        rows: SightingEnvironmentEntry[],
        accessor: (r: SightingEnvironmentEntry) => string | undefined,
        color: string
    ): void {
        const counts = new Map<string, number>();
        for (const r of rows) {
            const raw = accessor(r);
            if (!raw) {
                continue;
            }
            const label = raw.trim();
            if (label === '') {
                continue;
            }
            counts.set(label, (counts.get(label) ?? 0) + 1);
        }

        if (counts.size === 0) {
            jQuery('<div style="color:#888;font-size:0.8rem;">No values yet.</div>').appendTo(handle.target);
            return;
        }

        const entries = Array.from(counts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 8)
        .map(([label, count]) => ({label, count}));

        const containerWidth = handle.target.width() ?? 280;
        const containerHeight = handle.target.height() ?? 200;
        const margin = {top: 6, right: 24, bottom: 38, left: 110};
        const width = containerWidth - margin.left - margin.right;
        const height = containerHeight - margin.top - margin.bottom;

        const svg = d3.select(handle.target[0])
        .append('svg')
        .attr('width', containerWidth)
        .attr('height', containerHeight);

        const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

        const xMax = d3.max(entries, (d: {count: number}): number => d.count) ?? 1;
        const x = d3.scaleLinear().domain([0, xMax]).nice().range([0, width]);
        const y = d3.scaleBand()
            .domain(entries.map((d: {label: string}): string => d.label))
            .range([0, height])
            .padding(0.15);

        g.selectAll('rect')
        .data(entries)
        .enter()
        .append('rect')
        .attr('x', 0)
        .attr('y', (d: {label: string}): number => y(d.label) ?? 0)
        .attr('width', (d: {count: number}): number => x(d.count))
        .attr('height', y.bandwidth())
        .attr('fill', color);

        g.selectAll('text.bar-label')
        .data(entries)
        .enter()
        .append('text')
        .attr('class', 'bar-label')
        .attr('x', (d: {count: number}): number => x(d.count) + 4)
        .attr('y', (d: {label: string}): number => (y(d.label) ?? 0) + (y.bandwidth() / 2))
        .attr('dy', '0.35em')
        .attr('font-size', '0.75rem')
        .attr('fill', '#333')
        .text((d: {count: number}): string => `${d.count}`);

        g.append('g')
            .call(d3.axisLeft(y).tickSize(0))
            .selectAll('text')
            .attr('font-size', '0.72rem');

        g.append('g')
            .attr('transform', `translate(0,${height})`)
            .call(d3.axisBottom(x).ticks(4));

        MetricCharts._drawAxisLabels(svg, containerWidth, containerHeight, margin, handle.xLabel, handle.yLabel);
    }

}