import {
    Card,
    ContentCol,
    ContentColSize,
    ContentRow,
    LangText
} from 'bambooo';
import * as d3raw from 'd3';
import {
    Species as SpeciesAPI,
    SpeciesRegressionChart,
    SpeciesRegressionFit,
    SpeciesRegressionPoint,
    SpeciesRegressionSeries
} from '../../Api/Species';
import {Lang} from '../../Lang';
import {BasePage} from '../BasePage';

/*
 * Same d3-as-any pattern the rest of the project uses (see
 * TrackingChart, MetricCharts, Species/Profile). Keeps the chart code
 * readable; the surrounding TS stays fully typed.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const d3: any = d3raw;

/**
 * Cross-Species Analytics
 *
 * Companion page to the per-species Profile. Shows four scatter charts
 * with two regression overlays each: solid colored lines per species,
 * a thicker dashed black line for the pooled regression. The point of
 * the page is to surface Simpson-paradox effects — when aggregating
 * across species reverses the per-species trend, that's visible at a
 * glance because the dashed line points the "wrong way" relative to
 * the colored ones.
 *
 * The OLS math sits server-side (Profile route) so the page is a thin
 * d3 renderer plus a small helper for the regression-line endpoints.
 */
export class CrossSpeciesAnalytics extends BasePage {

    /**
     * Page name used by the sidebar.
     */
    public static NAME: string = 'cross-species-analytics';

    /**
     * Categorical palette (Tableau-10-style). The species_group color
     * coming from the DB is one of only ~3 blues, so 8 species rendered
     * with that scheme collapse visually — we override per species_id
     * with this distinct-hue palette, stable across all four charts.
     */
    private static readonly SPECIES_PALETTE: ReadonlyArray<string> = [
        '#1f77b4', '#ff7f0e', '#2ca02c', '#d62728', '#9467bd',
        '#8c564b', '#e377c2', '#7f7f7f', '#bcbd22', '#17becf'
    ];

    protected override _name: string = CrossSpeciesAnalytics.NAME;

    public override async loadContent(): Promise<void> {
        const lang = Lang.i();
        const title = lang.l('Cross-species analytics');

        const contentWrapper = this._wrapper.getContentWrapper().getContent();

        // Header card — short explainer ------------------------------------------------------------------------------

        const rowHead = new ContentRow(contentWrapper);
        const headCard = new Card(new ContentCol(rowHead, ContentColSize.col12));
        headCard.setTitle(new LangText(title));
        const headBody = jQuery('<div class="card-body small text-muted"/>').appendTo(headCard.getBodyElement());
        headBody.text(lang.l('desc.regression.page'));

        // Four chart cards (each row owns one chart) -----------------------------------------------------------------

        const hosts: Record<string, HTMLElement> = {};
        const cardSpecs: {id: string; titleKey: string; descKey: string;}[] = [
            {id: 'year_spue', titleKey: 'Year × SPUE', descKey: 'desc.reg.year_spue'},
            {id: 'sst_groupsize', titleKey: 'SST × group size', descKey: 'desc.reg.sst_groupsize'},
            {id: 'chl_groupsize', titleKey: 'Chlorophyll-a × group size', descKey: 'desc.reg.chl_groupsize'},
            {id: 'effort_saturation', titleKey: 'Tour effort × sightings', descKey: 'desc.reg.effort'}
        ];

        for (const spec of cardSpecs) {
            const row = new ContentRow(contentWrapper);
            const card = new Card(new ContentCol(row, ContentColSize.col12));
            card.setTitle(new LangText(spec.titleKey));
            CrossSpeciesAnalytics._attachInfo(card, spec.titleKey, spec.descKey);
            const host = jQuery<HTMLDivElement>('<div class="cross-species-chart"/>').appendTo(card.getBodyElement());
            hosts[spec.id] = host[0] as HTMLElement;
        }

        this._onLoadTable = async(): Promise<void> => {
            headCard.showLoading();
            try {
                const charts = await SpeciesAPI.getRegressionMatrix();
                if (!charts || charts.length === 0) {
                    return;
                }
                // Build a stable species→color map across every chart so
                // the same species reads the same on every plot.
                const colorBySpecies = CrossSpeciesAnalytics._buildColorMap(charts);
                for (const chart of charts) {
                    const host = hosts[chart.id];
                    if (host) {
                        CrossSpeciesAnalytics._renderScatter(host, chart, colorBySpecies);
                    }
                }
                Lang.i().lAll();
            } finally {
                headCard.hideLoading();
            }
        };

        await this._onLoadTable();
    }

    /**
     * Pick stable per-species colors from the categorical palette. The
     * species are sorted by total point count (descending, across all
     * charts) so the most prominent species reliably get the most
     * distinctive palette positions (early entries are also the most
     * distinct hues by design).
     */
    private static _buildColorMap(charts: SpeciesRegressionChart[]): Map<number, string> {
        const pointsBySpecies = new Map<number, number>();
        for (const chart of charts) {
            for (const series of chart.series) {
                pointsBySpecies.set(
                    series.species_id,
                    (pointsBySpecies.get(series.species_id) ?? 0) + series.points.length
                );
            }
        }

        const ranked = [...pointsBySpecies.entries()]
            .sort((a, b) => b[1] - a[1])
            .map(([id]) => id);

        const out = new Map<number, string>();
        for (let i = 0; i < ranked.length; i++) {
            out.set(ranked[i], CrossSpeciesAnalytics.SPECIES_PALETTE[i % CrossSpeciesAnalytics.SPECIES_PALETTE.length]);
        }
        return out;
    }

    /**
     * Render one scatter chart: points colored by species + per-species
     * regression line (when fit is present) + pooled regression line.
     * The pooled line is drawn last and thicker so it visually dominates;
     * when its slope sign disagrees with most colored lines, that's the
     * Simpson paradox moment.
     */
    private static _renderScatter(host: HTMLElement, chart: SpeciesRegressionChart, colorBySpecies: Map<number, string>): void {
        d3.select(host).selectAll('*').remove();
        jQuery(host).empty();

        const lang = Lang.i();

        const points: SpeciesRegressionPoint[] = [];
        for (const s of chart.series) {
            for (const p of s.points) {
                points.push(p);
            }
        }

        if (points.length === 0) {
            jQuery(host).text(lang.l('No data'));
            return;
        }

        const width = Math.max(360, (host.clientWidth || 900) - 24);
        const height = 360;
        const margin = {top: 12, right: 16, bottom: 48, left: 56};
        const innerW = width - margin.left - margin.right;
        const innerH = height - margin.top - margin.bottom;

        const svg = d3.select(host).append('svg').attr('width', width).attr('height', height);
        const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

        const xExtent = d3.extent(points, (p: SpeciesRegressionPoint) => p.x) as [number, number];
        const yExtent = d3.extent(points, (p: SpeciesRegressionPoint) => p.y) as [number, number];
        const xPad = (xExtent[1] - xExtent[0]) * 0.05 || 1;
        const yPad = (yExtent[1] - yExtent[0]) * 0.05 || 1;

        const x = d3.scaleLinear().domain([xExtent[0] - xPad, xExtent[1] + xPad]).nice().range([0, innerW]);
        const y = d3.scaleLinear().domain([Math.min(0, yExtent[0]) - yPad, yExtent[1] + yPad]).nice().range([innerH, 0]);

        // Axes + labels
        g.append('g').attr('transform', `translate(0,${innerH})`).call(d3.axisBottom(x).ticks(8));
        g.append('g').call(d3.axisLeft(y).ticks(6));

        g.append('text')
            .attr('x', innerW / 2)
            .attr('y', innerH + 36)
            .attr('text-anchor', 'middle')
            .style('font-size', '11px')
            .style('fill', '#6c757d')
            .text(lang.l(chart.x_label_key));
        g.append('text')
            .attr('transform', 'rotate(-90)')
            .attr('x', -innerH / 2)
            .attr('y', -margin.left + 16)
            .attr('text-anchor', 'middle')
            .style('font-size', '11px')
            .style('fill', '#6c757d')
            .text(lang.l(chart.y_label_key));

        // Points — per-series so we can color them and tooltip them.
        for (const series of chart.series) {
            const color = colorBySpecies.get(series.species_id) ?? series.color;
            g.append('g')
                .selectAll('circle')
                .data(series.points)
                .enter()
                .append('circle')
                .attr('cx', (p: SpeciesRegressionPoint) => x(p.x))
                .attr('cy', (p: SpeciesRegressionPoint) => y(p.y))
                .attr('r', 3)
                .attr('fill', color)
                .attr('opacity', 0.65)
                .append('title')
                .text((p: SpeciesRegressionPoint) => p.label ?? `${p.x.toFixed(2)}, ${p.y.toFixed(2)}`);
        }

        // Per-species regression lines (only when fit present).
        const xDomain = x.domain();
        for (const series of chart.series) {
            if (!series.fit) {
                continue;
            }
            const color = colorBySpecies.get(series.species_id) ?? series.color;
            CrossSpeciesAnalytics._drawFitLine(g, x, y, series.fit, xDomain, color, false);
        }

        // Pooled fit (thicker, dashed black). Drawn last so it sits on top.
        if (chart.pooled_fit) {
            CrossSpeciesAnalytics._drawFitLine(g, x, y, chart.pooled_fit, xDomain, '#000', true);
        }

        CrossSpeciesAnalytics._buildLegend(host, chart, colorBySpecies);
    }

    /**
     * Draw one regression line clipped to the x scale's domain.
     * `dashed=true` is used for the pooled line; per-species lines use
     * the same color as their points.
     */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    private static _drawFitLine(g: any, x: any, y: any, fit: SpeciesRegressionFit, xDomain: [number, number], color: string, dashed: boolean): void {
        const x0 = xDomain[0];
        const x1 = xDomain[1];
        const y0 = (fit.slope * x0) + fit.intercept;
        const y1 = (fit.slope * x1) + fit.intercept;

        g.append('line')
            .attr('x1', x(x0))
            .attr('y1', y(y0))
            .attr('x2', x(x1))
            .attr('y2', y(y1))
            .attr('stroke', color)
            .attr('stroke-width', dashed ? 2.5 : 1.5)
            .attr('opacity', dashed ? 1 : 0.85)
            .attr('stroke-dasharray', dashed ? '6,4' : null);
    }

    /**
     * Color-chip legend with slope + R² for every series that has a fit,
     * plus a dedicated entry for the pooled fit. Helps the reader spot a
     * sign mismatch (Simpson) at a glance.
     */
    private static _buildLegend(host: HTMLElement, chart: SpeciesRegressionChart, colorBySpecies: Map<number, string>): void {
        const lang = Lang.i();
        const legend = jQuery('<div class="mt-2 small d-flex flex-wrap" style="gap: 0.4rem 1rem;"/>');
        const escape = (s: string): string => s.replace(/[&<>"']/g, (ch) =>
            ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', '\'': '&#39;'})[ch] ?? ch);

        const slopeLabel = (fit: SpeciesRegressionFit): string =>
            `${lang.l('slope')} ${fit.slope.toFixed(3)} · R² ${fit.r2.toFixed(2)} · n=${fit.n}`;

        const renderRow = (color: string, label: string, fit: SpeciesRegressionFit | undefined, n: number, dashed: boolean): JQuery<HTMLElement> => {
            const dashBg = dashed
                ? 'background: repeating-linear-gradient(90deg, #000 0 4px, transparent 4px 8px);'
                : `background:${color};`;
            const slopeBit = fit ? `<span class="text-muted">${slopeLabel(fit)}</span>` : `<span class="text-muted">n=${n} · ${lang.l(`< min_n (no fit)`)}</span>`;
            return jQuery(
                '<span class="d-inline-flex align-items-center" style="gap:0.35rem;">' +
                `<span style="display:inline-block;width:14px;height:3px;${dashBg}"></span>` +
                `<span>${escape(label)}</span>${slopeBit}</span>`
            );
        };

        for (const s of chart.series as SpeciesRegressionSeries[]) {
            const color = colorBySpecies.get(s.species_id) ?? s.color;
            legend.append(renderRow(color, s.species_name, s.fit, s.points.length, false));
        }

        if (chart.pooled_fit) {
            legend.append(renderRow('#000', `${lang.l('Pooled fit')} ${lang.l('(all species)')}`, chart.pooled_fit, chart.pooled_fit.n, true));
        }

        jQuery(host).append(legend);
    }

    /**
     * Same pattern as Species/Profile._attachInfo — Bootstrap-4 popover
     * behind a small (i) icon next to the card title.
     */
    private static _attachInfo(card: Card, titleKey: string, descKey: string): void {
        const lang = Lang.i();
        const tools = card.getToolsElement();
        const escape = (s: string): string => s.replace(/[&<>"']/g, (ch) =>
            ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', '\'': '&#39;'})[ch] ?? ch);

        const btn = jQuery<HTMLButtonElement>(
            '<button type="button" class="btn btn-link btn-sm cross-species-info" ' +
            'style="padding:0 4px;color:#2c7fb8;text-decoration:none;line-height:1;" ' +
            `title="${escape(lang.l('Show description'))}">` +
            '<i class="fa fa-info-circle"></i></button>'
        );
        tools.append(btn);

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (btn as unknown as {popover: (opts: any) => void;}).popover({
            html: true,
            sanitize: false,
            trigger: 'click',
            placement: 'left',
            container: 'body',
            title: escape(lang.l(titleKey)),
            content: `<div style="font-size:0.85rem;line-height:1.45;max-width:380px;">${escape(lang.l(descKey))}</div>`
        });

        btn.on('shown.bs.popover', () => {
            jQuery(document).one('click.cross-species-info', (ev) => {
                if (!jQuery(ev.target).closest('.popover, .cross-species-info').length) {
                    (btn as unknown as {popover: (action: string) => void;}).popover('hide');
                }
            });
        });
    }

}