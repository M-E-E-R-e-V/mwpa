import {
    Card,
    ContentCol,
    ContentColSize,
    ContentRow,
    LangText,
    SidebarMenuItem,
    SidebarMenuItemBadge,
    SidebarMenuTree
} from 'bambooo';
import * as d3raw from 'd3';
import moment from 'moment';
import {fromLonLat} from 'ol/proj';
import {
    Species as SpeciesAPI,
    SpeciesProfileBucket,
    SpeciesProfileCategoryShare,
    SpeciesProfileData,
    SpeciesProfileHeadingBin,
    SpeciesProfileHeatmapPoint,
    SpeciesProfileMonthlyEffort,
    SpeciesProfileYearly
} from '../../Api/Species';
import {Lang} from '../../Lang';
import {BaseMap} from '../../Map/BaseMap';
import {OsmBaseLayer} from '../../Map/Layers/OsmBaseLayer';
import {SightingHeatmapLayer} from '../../Map/Layers/SightingHeatmapLayer';
import {SightingPointsLayer} from '../../Map/Layers/SightingPointsLayer';
import {SightingMapObjectType} from '../../Map/Styles/SightingStyles';
import {BasePage} from '../BasePage';
import {Species} from '../Species';

/*
 * Same pattern as MetricCharts.ts / TrackingChart.ts — cast d3 to `any`
 * to keep chart code readable. @types/d3 sub-package resolution from the
 * frontend workspace is inconsistent under ts-loader, so the rest of the
 * file stays typed and d3 is the only untyped surface.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const d3: any = d3raw;

/**
 * Species Profile page — opened from the Species list, shows aggregated
 * sighting analytics for one species: time distribution (per-month and
 * per-hour), group size + composition ratios, and environmental
 * preference (distance-to-coast, depth, SST, chl-a) histograms.
 *
 * The page owns no business logic — Profile.ts on the backend builds
 * the aggregates server-side and ships them as histogram buckets that
 * d3 can render directly.
 */
export class SpeciesProfile extends BasePage {

    protected override _name: string = 'species_profile';

    /**
     * Species id passed from the Species list page.
     */
    protected _speciesId: number;

    /**
     * Badge in the sidebar — set to n_sightings on load.
     */
    protected _badge: SidebarMenuItemBadge | null = null;

    /**
     * Mini map for the spatial heatmap — kept on the instance so unload
     * can dispose it cleanly.
     */
    protected _heatmap: BaseMap | null = null;

    public constructor(speciesId: number) {
        super();
        this._speciesId = speciesId;
    }

    public override async unloadContent(): Promise<void> {
        if (this._heatmap) {
            this._heatmap.unload();
            this._heatmap = null;
        }
    }

    public override async loadContent(): Promise<void> {
        const lang = Lang.i();
        const menuItem = this._wrapper.getMainSidebar().getSidebar().getMenu().getMenuItem(Species.NAME);
        const titleKey = 'Species Profile';
        const titleSuffix = ` #${this._speciesId}`;

        if (menuItem !== null) {
            const menuTree = new SidebarMenuTree(menuItem);
            const pmenuItem = new SidebarMenuItem(menuTree, true);
            pmenuItem.setTitle(`${lang.l(titleKey)}${titleSuffix}`);
            pmenuItem.setActiv(true);

            this._badge = new SidebarMenuItemBadge(pmenuItem);
            this._badge.setContent('…');
        }

        // KPI bar ----------------------------------------------------------------------------------------------------

        const rowKpi = new ContentRow(this._wrapper.getContentWrapper().getContent());
        const kpiCard = new Card(new ContentCol(rowKpi, ContentColSize.col12));
        kpiCard.setTitle(new LangText(`${titleKey}${titleSuffix}`));

        const kpiBody = jQuery('<div class="card-body"/>').appendTo(kpiCard.getBodyElement());
        const kpiGrid = jQuery<HTMLDivElement>(
            '<div class="d-flex flex-wrap" style="gap: 1.5rem;">' +
            `<div class="kpi" data-kpi="period"><div class="kpi-label text-muted small">${lang.l('Period')}</div><div class="kpi-value h5 mb-0">–</div></div>` +
            `<div class="kpi" data-kpi="n"><div class="kpi-label text-muted small">${lang.l('Sightings')}</div><div class="kpi-value h5 mb-0">–</div></div>` +
            `<div class="kpi" data-kpi="total"><div class="kpi-label text-muted small">${lang.l('Animals (sum)')}</div><div class="kpi-value h5 mb-0">–</div></div>` +
            `<div class="kpi" data-kpi="p50"><div class="kpi-label text-muted small">${lang.l('Median group')}</div><div class="kpi-value h5 mb-0">–</div></div>` +
            `<div class="kpi" data-kpi="p95"><div class="kpi-label text-muted small">${lang.l('p95 group')}</div><div class="kpi-value h5 mb-0">–</div></div>` +
            '</div>'
        ).appendTo(kpiBody);

        // Row 2 — time distribution (monthly + hourly side-by-side) ---------------------------------------------------

        const rowTime = new ContentRow(this._wrapper.getContentWrapper().getContent());
        const monthlyCard = new Card(new ContentCol(rowTime, ContentColSize.colMd6));
        monthlyCard.setTitle(new LangText('Sightings per month'));
        SpeciesProfile._attachInfo(monthlyCard, 'Sightings per month', 'desc.monthly');
        const monthlyHost = jQuery<HTMLDivElement>('<div class="species-profile-chart"/>').appendTo(monthlyCard.getBodyElement());

        const hourlyCard = new Card(new ContentCol(rowTime, ContentColSize.colMd6));
        hourlyCard.setTitle(new LangText('Sightings per hour-of-day'));
        SpeciesProfile._attachInfo(hourlyCard, 'Sightings per hour-of-day', 'desc.hourly');
        const hourlyHost = jQuery<HTMLDivElement>('<div class="species-profile-chart"/>').appendTo(hourlyCard.getBodyElement());

        // Row 3 — group size + ratios ---------------------------------------------------------------------------------

        const rowGroup = new ContentRow(this._wrapper.getContentWrapper().getContent());
        const sizeCard = new Card(new ContentCol(rowGroup, ContentColSize.colMd6));
        sizeCard.setTitle(new LangText('Group size distribution'));
        SpeciesProfile._attachInfo(sizeCard, 'Group size distribution', 'desc.group_size');
        const sizeHost = jQuery<HTMLDivElement>('<div class="species-profile-chart"/>').appendTo(sizeCard.getBodyElement());

        const ratiosCard = new Card(new ContentCol(rowGroup, ContentColSize.colMd6));
        ratiosCard.setTitle(new LangText('Composition (sightings reporting …)'));
        SpeciesProfile._attachInfo(ratiosCard, 'Composition (sightings reporting …)', 'desc.group_ratios');
        const ratiosHost = jQuery<HTMLDivElement>('<div class="species-profile-ratios card-body"/>').appendTo(ratiosCard.getBodyElement());

        // Row 4 — environment grid (4 mini-histograms) ----------------------------------------------------------------

        const rowEnv = new ContentRow(this._wrapper.getContentWrapper().getContent());
        const envCard = new Card(new ContentCol(rowEnv, ContentColSize.col12));
        envCard.setTitle(new LangText('Environment preference'));
        SpeciesProfile._attachInfo(envCard, 'Environment preference', 'desc.env');

        const envGrid = jQuery<HTMLDivElement>(
            '<div class="row p-2">' +
            `<div class="col-md-3"><div class="text-muted small">${lang.l('Distance to coast (m)')}</div><div class="species-profile-chart" data-env="distance"></div></div>` +
            `<div class="col-md-3"><div class="text-muted small">${lang.l('Sea depth (m)')}</div><div class="species-profile-chart" data-env="depth"></div></div>` +
            `<div class="col-md-3"><div class="text-muted small">${lang.l('SST (°C)')}</div><div class="species-profile-chart" data-env="sst"></div></div>` +
            `<div class="col-md-3"><div class="text-muted small">${lang.l('Chl-a (mg/m³)')}</div><div class="species-profile-chart" data-env="chl"></div></div>` +
            '</div>'
        ).appendTo(envCard.getBodyElement());

        // Row 5 — behaviour + reaction donuts -------------------------------------------------------------------------

        const rowBeh = new ContentRow(this._wrapper.getContentWrapper().getContent());
        const behaviourCard = new Card(new ContentCol(rowBeh, ContentColSize.colMd6));
        behaviourCard.setTitle(new LangText('Behaviour mix'));
        SpeciesProfile._attachInfo(behaviourCard, 'Behaviour mix', 'desc.behaviour');
        const behaviourHost = jQuery<HTMLDivElement>('<div class="species-profile-chart"/>').appendTo(behaviourCard.getBodyElement());

        const reactionCard = new Card(new ContentCol(rowBeh, ContentColSize.colMd6));
        reactionCard.setTitle(new LangText('Reaction to boat'));
        SpeciesProfile._attachInfo(reactionCard, 'Reaction to boat', 'desc.reaction');
        const reactionHost = jQuery<HTMLDivElement>('<div class="species-profile-chart"/>').appendTo(reactionCard.getBodyElement());

        // Row 6 — movement signature ----------------------------------------------------------------------------------

        const rowMove = new ContentRow(this._wrapper.getContentWrapper().getContent());
        const movementCard = new Card(new ContentCol(rowMove, ContentColSize.col12));
        movementCard.setTitle(new LangText('Movement signature (derived from SightingMovement)'));
        SpeciesProfile._attachInfo(movementCard, 'Movement signature (derived from SightingMovement)', 'desc.movement');

        const movementBody = jQuery<HTMLDivElement>(
            '<div class="row p-2">' +
            '<div class="col-md-7 d-flex flex-wrap" style="gap: 1.5rem;">' +
            `<div class="kpi" data-mkpi="n"><div class="kpi-label text-muted small">${lang.l('Sightings w/ movement')}</div><div class="kpi-value h5 mb-0">–</div></div>` +
            `<div class="kpi" data-mkpi="avg"><div class="kpi-label text-muted small">${lang.l('Median avg speed')}</div><div class="kpi-value h5 mb-0">–</div></div>` +
            `<div class="kpi" data-mkpi="max"><div class="kpi-label text-muted small">${lang.l('Median max speed')}</div><div class="kpi-value h5 mb-0">–</div></div>` +
            `<div class="kpi" data-mkpi="dist"><div class="kpi-label text-muted small">${lang.l('Median total distance')}</div><div class="kpi-value h5 mb-0">–</div></div>` +
            '</div>' +
            `<div class="col-md-5"><div class="text-muted small">${lang.l('Dominant heading rose')}</div><div class="species-profile-chart" data-rose></div></div>` +
            '</div>'
        ).appendTo(movementCard.getBodyElement());

        // Row 7 — SPUE (Sightings Per Unit Effort) --------------------------------------------------------------------

        const rowSpue = new ContentRow(this._wrapper.getContentWrapper().getContent());
        const spueCard = new Card(new ContentCol(rowSpue, ContentColSize.col12));
        spueCard.setTitle(new LangText('Sightings per tour-hour (SPUE)'));
        SpeciesProfile._attachInfo(spueCard, 'Sightings per tour-hour (SPUE)', 'desc.spue');
        const spueHost = jQuery<HTMLDivElement>('<div class="species-profile-chart"/>').appendTo(spueCard.getBodyElement());

        // Row 8 — yearly trend ----------------------------------------------------------------------------------------

        const rowYearly = new ContentRow(this._wrapper.getContentWrapper().getContent());
        const yearlyCard = new Card(new ContentCol(rowYearly, ContentColSize.colMd6));
        yearlyCard.setTitle(new LangText('Sightings per year'));
        SpeciesProfile._attachInfo(yearlyCard, 'Sightings per year', 'desc.yearly');
        const yearlyHost = jQuery<HTMLDivElement>('<div class="species-profile-chart"/>').appendTo(yearlyCard.getBodyElement());

        // Co-occurrence card next to yearly
        const cooccCard = new Card(new ContentCol(rowYearly, ContentColSize.colMd6));
        cooccCard.setTitle(new LangText('Co-occurring species (same tour)'));
        SpeciesProfile._attachInfo(cooccCard, 'Co-occurring species (same tour)', 'desc.cooccurrence');
        const cooccHost = jQuery<HTMLDivElement>('<div class="species-profile-chart"/>').appendTo(cooccCard.getBodyElement());

        // Row 9 — pressure indicators --------------------------------------------------------------------------------

        const rowPress = new ContentRow(this._wrapper.getContentWrapper().getContent());
        const pressureCard = new Card(new ContentCol(rowPress, ContentColSize.col12));
        pressureCard.setTitle(new LangText('Pressure indicators'));
        SpeciesProfile._attachInfo(pressureCard, 'Pressure indicators', 'desc.pressure');

        const pressureGrid = jQuery<HTMLDivElement>(
            '<div class="row p-2">' +
            `<div class="col-md-4"><div class="text-muted small">${lang.l('Beaufort sea state')}</div><div class="species-profile-chart" data-press="beaufort"></div></div>` +
            `<div class="col-md-4"><div class="text-muted small">${lang.l('Other boats present')}</div><div class="species-profile-chart" data-press="boats"></div></div>` +
            `<div class="col-md-4"><div class="text-muted small">${lang.l('Fishing hours (25 km, day)')}</div><div class="species-profile-chart" data-press="fishing"></div></div>` +
            '</div>'
        ).appendTo(pressureCard.getBodyElement());

        // Row 10 — extra env distributions ---------------------------------------------------------------------------

        const rowEnvExtra = new ContentRow(this._wrapper.getContentWrapper().getContent());
        const envExtraCard = new Card(new ContentCol(rowEnvExtra, ContentColSize.col12));
        envExtraCard.setTitle(new LangText('Extended environment (oceanographic)'));
        SpeciesProfile._attachInfo(envExtraCard, 'Extended environment (oceanographic)', 'desc.env_extra');

        const envExtraGrid = jQuery<HTMLDivElement>(
            '<div class="row p-2">' +
            `<div class="col-md-2-4"><div class="text-muted small">${lang.l('Salinity (PSU)')}</div><div class="species-profile-chart" data-envx="salinity"></div></div>` +
            `<div class="col-md-2-4"><div class="text-muted small">${lang.l('SLA (cm)')}</div><div class="species-profile-chart" data-envx="sla"></div></div>` +
            `<div class="col-md-2-4"><div class="text-muted small">${lang.l('Current speed (m/s)')}</div><div class="species-profile-chart" data-envx="current"></div></div>` +
            `<div class="col-md-2-4"><div class="text-muted small">${lang.l('Wave height (m)')}</div><div class="species-profile-chart" data-envx="wave"></div></div>` +
            `<div class="col-md-2-4"><div class="text-muted small">${lang.l('UV index')}</div><div class="species-profile-chart" data-envx="uv"></div></div>` +
            '</div>' +
            // Custom 5-column row helper — Bootstrap 4 doesn't ship col-md-2-4,
            // so define it inline to avoid touching the global stylesheet.
            '<style>.col-md-2-4{flex:0 0 20%;max-width:20%;padding-right:7.5px;padding-left:7.5px;}</style>'
        ).appendTo(envExtraCard.getBodyElement());

        // Row 11 — spatial heatmap ------------------------------------------------------------------------------------

        const rowMap = new ContentRow(this._wrapper.getContentWrapper().getContent());
        const mapCard = new Card(new ContentCol(rowMap, ContentColSize.col12));
        mapCard.setTitle(new LangText('Spatial distribution'));
        SpeciesProfile._attachInfo(mapCard, 'Spatial distribution', 'desc.heatmap');
        const mapHost = jQuery<HTMLDivElement>('<div class="species-profile-map" style="height: 360px;"/>').appendTo(mapCard.getBodyElement());

        this._onLoadTable = async(): Promise<void> => {
            kpiCard.showLoading();
            try {
                const profile = await SpeciesAPI.getProfile(this._speciesId);
                if (!profile) {
                    kpiCard.setTitle(new LangText(`${titleKey}${titleSuffix} — ${lang.l('No data')}`));
                    return;
                }

                kpiCard.setTitle(new LangText(`${lang.l(titleKey)} — ${profile.species_name} (#${profile.species_id})`));

                if (this._badge) {
                    this._badge.setContent(`${profile.n_sightings}`);
                }

                SpeciesProfile._renderKpi(kpiGrid, profile);
                SpeciesProfile._renderMonthly(monthlyHost[0] as HTMLElement, profile);
                SpeciesProfile._renderHourly(hourlyHost[0] as HTMLElement, profile);
                SpeciesProfile._renderBuckets(sizeHost[0] as HTMLElement, profile.group_size, '#2471A3');
                SpeciesProfile._renderRatios(ratiosHost, profile);

                envGrid.find('[data-env="distance"]').each((_i, el) => {
                    SpeciesProfile._renderBuckets(el as HTMLElement, profile.env.distance_coast_m, '#17a2b8');
                });
                envGrid.find('[data-env="depth"]').each((_i, el) => {
                    SpeciesProfile._renderBuckets(el as HTMLElement, profile.env.depth_m, '#6f42c1');
                });
                envGrid.find('[data-env="sst"]').each((_i, el) => {
                    SpeciesProfile._renderBuckets(el as HTMLElement, profile.env.sst_c, '#dc3545');
                });
                envGrid.find('[data-env="chl"]').each((_i, el) => {
                    SpeciesProfile._renderBuckets(el as HTMLElement, profile.env.chl_a_mg_m3, '#28a745');
                });

                SpeciesProfile._renderDonut(behaviourHost[0] as HTMLElement, profile.behaviour_mix);
                SpeciesProfile._renderDonut(reactionHost[0] as HTMLElement, profile.reaction_mix);

                SpeciesProfile._renderMovementKpi(movementBody, profile);
                movementBody.find('[data-rose]').each((_i, el) => {
                    SpeciesProfile._renderHeadingRose(el as HTMLElement, profile.movement.heading_rose);
                });

                SpeciesProfile._renderSpue(spueHost[0] as HTMLElement, profile.monthly_effort);
                SpeciesProfile._renderYearly(yearlyHost[0] as HTMLElement, profile.yearly);
                SpeciesProfile._renderCooccurrence(cooccHost[0] as HTMLElement, profile.cooccurrence);

                pressureGrid.find('[data-press="beaufort"]').each((_i, el) => {
                    SpeciesProfile._renderBuckets(el as HTMLElement, profile.pressure.beaufort, '#0d6efd');
                });
                pressureGrid.find('[data-press="boats"]').each((_i, el) => {
                    SpeciesProfile._renderBuckets(el as HTMLElement, profile.pressure.other_boats, '#fd7e14');
                });
                pressureGrid.find('[data-press="fishing"]').each((_i, el) => {
                    SpeciesProfile._renderBuckets(el as HTMLElement, profile.pressure.fishing_hours_25km, '#c14953');
                });

                envExtraGrid.find('[data-envx="salinity"]').each((_i, el) => {
                    SpeciesProfile._renderBuckets(el as HTMLElement, profile.env_extra.salinity_psu, '#264653');
                });
                envExtraGrid.find('[data-envx="sla"]').each((_i, el) => {
                    SpeciesProfile._renderBuckets(el as HTMLElement, profile.env_extra.sla_cm, '#4a90c2');
                });
                envExtraGrid.find('[data-envx="current"]').each((_i, el) => {
                    SpeciesProfile._renderBuckets(el as HTMLElement, profile.env_extra.current_speed_m_s, '#1d6f8a');
                });
                envExtraGrid.find('[data-envx="wave"]').each((_i, el) => {
                    SpeciesProfile._renderBuckets(el as HTMLElement, profile.env_extra.wave_height_m, '#2a9d8f');
                });
                envExtraGrid.find('[data-envx="uv"]').each((_i, el) => {
                    SpeciesProfile._renderBuckets(el as HTMLElement, profile.env_extra.uv_index, '#d4a017');
                });

                this._heatmap = SpeciesProfile._renderHeatmap(mapHost[0] as HTMLElement, profile.heatmap, this._heatmap);
                Lang.i().lAll();
            } finally {
                kpiCard.hideLoading();
            }
        };

        this._onLoadTable();
    }

    /**
     * Combined bar + line chart for SPUE: bars = sightings/month, line =
     * tour-hours/month on a secondary axis, dotted line = SPUE (per-hour
     * rate) on the count axis (re-scaled).
     */
    private static _renderSpue(host: HTMLElement, rows: SpeciesProfileMonthlyEffort[]): void {
        d3.select(host).selectAll('*').remove();
        const lang = Lang.i();
        if (rows.length === 0) {
            jQuery(host).text(lang.l('No data'));
            return;
        }

        const width = Math.max(320, (host.clientWidth || 800) - 24);
        const height = 220;
        const margin = {top: 16, right: 56, bottom: 52, left: 48};
        const innerW = width - margin.left - margin.right;
        const innerH = height - margin.top - margin.bottom;

        const svg = d3.select(host).append('svg').attr('width', width).attr('height', height);
        const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

        const x = d3.scaleBand().domain(rows.map((r: SpeciesProfileMonthlyEffort) => r.ym)).range([0, innerW]).padding(0.15);
        const maxSightings = d3.max(rows, (r: SpeciesProfileMonthlyEffort) => r.sightings) ?? 1;
        const yL = d3.scaleLinear().domain([0, Math.max(1, maxSightings)]).nice().range([innerH, 0]);

        const maxHours = d3.max(rows, (r: SpeciesProfileMonthlyEffort) => r.tour_hours) ?? 1;
        const yR = d3.scaleLinear().domain([0, Math.max(1, maxHours)]).nice().range([innerH, 0]);

        const tickLabels = SpeciesProfile._everyNthTick(rows.map((r: SpeciesProfileMonthlyEffort) => r.ym), 3);

        g.append('g')
            .attr('transform', `translate(0,${innerH})`)
            .call(d3.axisBottom(x).tickValues(tickLabels))
            .selectAll('text')
            .attr('transform', 'rotate(-45)')
            .style('text-anchor', 'end');
        g.append('g').call(d3.axisLeft(yL).ticks(4));
        g.append('g')
            .attr('transform', `translate(${innerW},0)`)
            .call(d3.axisRight(yR).ticks(4));

        // Sightings bars
        g.selectAll('rect')
            .data(rows)
            .enter()
            .append('rect')
            .attr('x', (r: SpeciesProfileMonthlyEffort) => x(r.ym))
            .attr('width', x.bandwidth())
            .attr('y', (r: SpeciesProfileMonthlyEffort) => yL(r.sightings))
            .attr('height', (r: SpeciesProfileMonthlyEffort) => innerH - yL(r.sightings))
            .attr('fill', '#2471A3')
            .attr('opacity', 0.75)
            .append('title')
            .text((r: SpeciesProfileMonthlyEffort) =>
                `${r.ym}\n${lang.l('Sightings')}: ${r.sightings}\n${lang.l('Tour hours')}: ${r.tour_hours.toFixed(1)}\nSPUE: ${r.spue.toFixed(3)}`);

        // Tour-hours line (solid, light)
        const linePts = rows.map((r: SpeciesProfileMonthlyEffort) => ({
            cx: (x(r.ym) ?? 0) + x.bandwidth() / 2,
            cy: yR(r.tour_hours)
        }));
        for (let i = 1; i < linePts.length; i++) {
            g.append('line')
                .attr('x1', linePts[i - 1].cx)
                .attr('y1', linePts[i - 1].cy)
                .attr('x2', linePts[i].cx)
                .attr('y2', linePts[i].cy)
                .attr('stroke', '#fd7e14')
                .attr('stroke-width', 2);
        }

        // SPUE line on the left axis (scaled into yL via a ratio)
        const maxSpue = d3.max(rows, (r: SpeciesProfileMonthlyEffort) => r.spue) ?? 0;
        if (maxSpue > 0) {
            const yLDomainMax = yL.domain()[1];
            const scale = yLDomainMax / maxSpue;
            const spuePts = rows.map((r: SpeciesProfileMonthlyEffort) => ({
                cx: (x(r.ym) ?? 0) + x.bandwidth() / 2,
                cy: yL(r.spue * scale)
            }));
            for (let i = 1; i < spuePts.length; i++) {
                g.append('line')
                    .attr('x1', spuePts[i - 1].cx)
                    .attr('y1', spuePts[i - 1].cy)
                    .attr('x2', spuePts[i].cx)
                    .attr('y2', spuePts[i].cy)
                    .attr('stroke', '#28a745')
                    .attr('stroke-width', 2)
                    .attr('stroke-dasharray', '4,3');
            }
        }

        // Mini legend
        const legend = jQuery(
            '<div class="small mt-1 d-flex flex-wrap" style="gap: 0.75rem;">' +
            `<span><span style="display:inline-block;width:10px;height:10px;background:#2471A3;"></span> ${lang.l('Sightings')}</span>` +
            `<span><span style="display:inline-block;width:10px;height:2px;background:#fd7e14;vertical-align:middle;"></span> ${lang.l('Tour hours')}</span>` +
            `<span><span style="display:inline-block;width:10px;height:0;border-top:2px dashed #28a745;vertical-align:middle;"></span> SPUE</span>` +
            '</div>'
        );
        jQuery(host).append(legend);
    }

    /**
     * Yearly trend — a single bar per year.
     */
    private static _renderYearly(host: HTMLElement, rows: SpeciesProfileYearly[]): void {
        d3.select(host).selectAll('*').remove();
        if (rows.length === 0) {
            jQuery(host).text(Lang.i().l('No data'));
            return;
        }

        const width = Math.max(280, (host.clientWidth || 480) - 24);
        const height = 200;
        const margin = {top: 12, right: 12, bottom: 32, left: 40};
        const innerW = width - margin.left - margin.right;
        const innerH = height - margin.top - margin.bottom;

        const svg = d3.select(host).append('svg').attr('width', width).attr('height', height);
        const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

        const x = d3.scaleBand().domain(rows.map((r: SpeciesProfileYearly) => r.y)).range([0, innerW]).padding(0.15);
        const yMax = d3.max(rows, (r: SpeciesProfileYearly) => r.count) ?? 1;
        const y = d3.scaleLinear().domain([0, Math.max(1, yMax)]).nice().range([innerH, 0]);

        g.append('g').attr('transform', `translate(0,${innerH})`).call(d3.axisBottom(x));
        g.append('g').call(d3.axisLeft(y).ticks(4));

        g.selectAll('rect')
            .data(rows)
            .enter()
            .append('rect')
            .attr('x', (r: SpeciesProfileYearly) => x(r.y))
            .attr('width', x.bandwidth())
            .attr('y', (r: SpeciesProfileYearly) => y(r.count))
            .attr('height', (r: SpeciesProfileYearly) => innerH - y(r.count))
            .attr('fill', '#6f42c1')
            .append('title')
            .text((r: SpeciesProfileYearly) => `${r.y}: ${r.count}`);
    }

    /**
     * Horizontal bar chart of co-occurring species (top-N by tour count).
     */
    private static _renderCooccurrence(host: HTMLElement, items: SpeciesProfileCategoryShare[]): void {
        d3.select(host).selectAll('*').remove();
        const lang = Lang.i();
        if (items.length === 0) {
            jQuery(host).text(lang.l('No data'));
            return;
        }

        const top = items.slice(0, 12);
        const width = Math.max(280, (host.clientWidth || 480) - 24);
        const rowHeight = 18;
        const height = Math.max(100, top.length * (rowHeight + 4) + 28);
        const margin = {top: 8, right: 40, bottom: 16, left: 160};
        const innerW = width - margin.left - margin.right;
        const innerH = height - margin.top - margin.bottom;

        const svg = d3.select(host).append('svg').attr('width', width).attr('height', height);
        const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

        const y = d3.scaleBand().domain(top.map((d: SpeciesProfileCategoryShare) => d.label)).range([0, innerH]).padding(0.15);
        const xMax = d3.max(top, (d: SpeciesProfileCategoryShare) => d.count) ?? 1;
        const x = d3.scaleLinear().domain([0, Math.max(1, xMax)]).range([0, innerW]);

        g.append('g').call(d3.axisLeft(y));
        g.append('g').attr('transform', `translate(0,${innerH})`).call(d3.axisBottom(x).ticks(4));

        g.selectAll('rect')
            .data(top)
            .enter()
            .append('rect')
            .attr('y', (d: SpeciesProfileCategoryShare) => y(d.label))
            .attr('x', 0)
            .attr('height', y.bandwidth())
            .attr('width', (d: SpeciesProfileCategoryShare) => x(d.count))
            .attr('fill', '#16a085')
            .append('title')
            .text((d: SpeciesProfileCategoryShare) => `${d.label}: ${d.count} ${lang.l('tours')}`);

        g.selectAll('text.cooc-value')
            .data(top)
            .enter()
            .append('text')
            .attr('class', 'cooc-value')
            .attr('x', (d: SpeciesProfileCategoryShare) => x(d.count) + 4)
            .attr('y', (d: SpeciesProfileCategoryShare) => (y(d.label) ?? 0) + y.bandwidth() / 2 + 4)
            .style('font-size', '10px')
            .text((d: SpeciesProfileCategoryShare) => d.count);
    }

    /**
     * Adds an `(i)` info icon to the card's tools area with a Bootstrap-4
     * click popover. Both the title and description run through the
     * translation layer; `descKey` should look up the longer description
     * in Lang_DE / Lang_ES (e.g. 'desc.monthly'). The English fallback is
     * the key itself when no entry is present.
     */
    private static _attachInfo(card: Card, titleKey: string, descKey: string): void {
        const lang = Lang.i();
        const tools = card.getToolsElement();
        const escape = (s: string): string => s.replace(/[&<>"']/g, (ch) =>
            ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', '\'': '&#39;'})[ch] ?? ch);

        const btn = jQuery<HTMLButtonElement>(
            '<button type="button" class="btn btn-link btn-sm species-profile-info" ' +
            'style="padding:0 4px;color:#2c7fb8;text-decoration:none;line-height:1;" ' +
            `title="${escape(lang.l('Show description'))}">` +
            '<i class="fa fa-info-circle"></i></button>'
        );
        tools.append(btn);

        // Bootstrap 4 popover. `sanitize:false` keeps our HTML; titles still
        // run through escapeHtml.
        (btn as unknown as {popover: (opts: object) => void;}).popover({
            html: true,
            sanitize: false,
            trigger: 'click',
            placement: 'left',
            container: 'body',
            title: escape(lang.l(titleKey)),
            content: `<div style="font-size:0.85rem;line-height:1.45;max-width:340px;">${escape(lang.l(descKey))}</div>`
        });

        // Auto-dismiss on outside click — Bootstrap's default leaves them open.
        btn.on('shown.bs.popover', () => {
            jQuery(document).one('click.species-profile-info', (ev) => {
                if (!jQuery(ev.target).closest('.popover, .species-profile-info').length) {
                    (btn as unknown as {popover: (action: string) => void;}).popover('hide');
                }
            });
        });
    }

    /**
     * Donut chart for label/count shares. Empty input → placeholder.
     * Slices are colored from a small palette and labelled with their
     * percentage when ≥ 5 %.
     */
    private static _renderDonut(host: HTMLElement, items: SpeciesProfileCategoryShare[]): void {
        d3.select(host).selectAll('*').remove();

        const total = items.reduce((s, it) => s + it.count, 0);
        if (total === 0) {
            jQuery(host).text(Lang.i().l('No data'));
            return;
        }

        const width = Math.max(220, (host.clientWidth || 320) - 16);
        const height = 220;
        const radius = Math.min(width, height) / 2 - 4;
        const inner = radius * 0.55;

        const palette = ['#2471A3', '#85C1E9', '#16a085', '#28a745', '#f39c12', '#dc3545', '#6f42c1', '#6c757d'];

        const svg = d3.select(host).append('svg').attr('width', width).attr('height', height);
        const g = svg.append('g').attr('transform', `translate(${width / 2},${height / 2})`);

        const pie = d3.pie().sort(null).value((d: SpeciesProfileCategoryShare) => d.count);
        const arc = d3.arc().innerRadius(inner).outerRadius(radius);
        const labelArc = d3.arc().innerRadius(radius * 0.78).outerRadius(radius * 0.78);

        const arcs = g.selectAll('g.slice').data(pie(items)).enter().append('g').attr('class', 'slice');
        arcs.append('path')
            .attr('d', arc)
            .attr('fill', (_d: unknown, i: number) => palette[i % palette.length])
            .append('title')
            .text((d: {data: SpeciesProfileCategoryShare;}) => `${d.data.label}: ${d.data.count} (${((d.data.count / total) * 100).toFixed(1)}%)`);

        arcs.append('text')
            .attr('transform', (d: unknown) => `translate(${labelArc.centroid(d)})`)
            .attr('text-anchor', 'middle')
            .style('font-size', '10px')
            .style('fill', '#000')
            .text((d: {data: SpeciesProfileCategoryShare;}) => {
                const pct = (d.data.count / total) * 100;
                return pct >= 5 ? `${d.data.label}` : '';
            });

        // Legend strip below the chart.
        const legend = jQuery('<div class="mt-2 small d-flex flex-wrap" style="gap: 0.5rem 1rem;"/>');
        for (let i = 0; i < items.length; i++) {
            const color = palette[i % palette.length];
            const pct = (items[i].count / total) * 100;
            const safe = items[i].label.replace(/[&<>"']/g, (ch) =>
                ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', '\'': '&#39;'})[ch] ?? ch);
            legend.append(
                '<span class="d-inline-flex align-items-center" style="gap: 0.35rem;">' +
                `<span style="display:inline-block;width:10px;height:10px;background:${color};border-radius:2px;"></span>` +
                `<span>${safe}</span><span class="text-muted">${items[i].count} (${pct.toFixed(1)}%)</span></span>`
            );
        }
        jQuery(host).append(legend);
    }

    /**
     * KPI values for the movement card. The card hosts four labelled
     * cells; render fills them in-place.
     */
    private static _renderMovementKpi(host: JQuery<HTMLDivElement>, profile: SpeciesProfileData): void {
        const set = (key: string, value: string): void => {
            host.find(`[data-mkpi="${key}"] .kpi-value`).text(value);
        };
        const m = profile.movement;
        set('n', `${m.n_with_movement}`);
        set('avg', m.n_with_movement > 0 ? `${m.median_avg_speed_kt.toFixed(2)} kt` : '–');
        set('max', m.n_with_movement > 0 ? `${m.median_max_speed_kt.toFixed(2)} kt` : '–');
        set('dist', m.n_with_movement > 0 ? `${SpeciesProfile._compact(m.median_total_distance_m)} m` : '–');
    }

    /**
     * Polar bar chart for the dominant-heading distribution. 8 compass
     * bins, angle = bin_deg, length ∝ count.
     */
    private static _renderHeadingRose(host: HTMLElement, bins: SpeciesProfileHeadingBin[]): void {
        d3.select(host).selectAll('*').remove();

        const total = bins.reduce((s, b) => s + b.count, 0);
        if (total === 0) {
            jQuery(host).text(Lang.i().l('No heading data'));
            return;
        }

        const size = Math.max(220, Math.min(host.clientWidth || 280, 320));
        const margin = 16;
        const radius = size / 2 - margin;
        const maxCount = Math.max(1, d3.max(bins, (b: SpeciesProfileHeadingBin) => b.count) ?? 1);

        const svg = d3.select(host).append('svg').attr('width', size).attr('height', size);
        const g = svg.append('g').attr('transform', `translate(${size / 2},${size / 2})`);

        // Reference circles (25/50/75/100 %).
        for (const ratio of [0.25, 0.5, 0.75, 1]) {
            g.append('circle')
                .attr('r', radius * ratio)
                .attr('fill', 'none')
                .attr('stroke', '#dee2e6')
                .attr('stroke-dasharray', ratio === 1 ? null : '2,3');
        }

        // Compass labels around the outer ring.
        const compass = ['N', 'E', 'S', 'W'];
        const compassAngles = [0, 90, 180, 270];
        for (let i = 0; i < compass.length; i++) {
            const rad = (compassAngles[i] - 90) * Math.PI / 180;
            g.append('text')
                .attr('x', Math.cos(rad) * (radius + 10))
                .attr('y', Math.sin(rad) * (radius + 10))
                .attr('text-anchor', 'middle')
                .attr('dominant-baseline', 'central')
                .style('font-size', '11px')
                .style('fill', '#6c757d')
                .text(compass[i]);
        }

        // Bin sectors — 8 wedges 45° wide each.
        const halfWedge = (Math.PI / 8); // 22.5° in rad
        for (const bin of bins) {
            const center = (bin.bin_deg - 90) * Math.PI / 180;
            const r = (bin.count / maxCount) * radius;
            const path = d3.path();
            path.moveTo(0, 0);
            path.arc(0, 0, r, center - halfWedge, center + halfWedge);
            path.closePath();

            g.append('path')
                .attr('d', path.toString())
                .attr('fill', '#2471A3')
                .attr('opacity', 0.7)
                .attr('stroke', 'white')
                .attr('stroke-width', 1)
                .append('title')
                .text(`${bin.label} (${bin.bin_deg}°): ${bin.count} (${((bin.count / total) * 100).toFixed(1)}%)`);
        }
    }

    /**
     * Mini-map with a heatmap layer fed from the per-sighting locations.
     * Returns the BaseMap instance so the caller can dispose it on
     * unloadContent. Replaces a previous map if one was already attached.
     */
    private static _renderHeatmap(host: HTMLElement, points: SpeciesProfileHeatmapPoint[], prev: BaseMap | null): BaseMap | null {
        if (prev) {
            prev.unload();
        }
        jQuery(host).empty();

        if (points.length === 0) {
            jQuery(host).text(Lang.i().l('No positions'));
            return null;
        }

        const map = new BaseMap(jQuery(host));
        map.setHeight(360);
        map.load({initialCenterLonLat: [0, 0], initialZoom: 2});
        map.addLayer(new OsmBaseLayer());

        const pts = new SightingPointsLayer();
        const heat = new SightingHeatmapLayer();
        map.addLayer(pts);
        // The heatmap layer must share the points' VectorSource. addLayer
        // builds the OL layer via getOlLayer, so we need to set the source
        // before the heatmap is attached.
        map.addLayer(heat);

        const ptsSource = pts.getSource();
        if (ptsSource) {
            heat.setSource(ptsSource);
        }

        let sumLon = 0;
        let sumLat = 0;
        let n = 0;
        for (const p of points) {
            pts.addSighting(
                SightingMapObjectType.PickMarker,
                `${n}`,
                `lon ${p.lon.toFixed(3)}, lat ${p.lat.toFixed(3)} · ${p.count}`,
                [p.lon, p.lat]
            );
            sumLon += p.lon;
            sumLat += p.lat;
            n++;
        }
        pts.refresh();
        heat.refresh();

        if (n > 0) {
            map.setView(fromLonLat([sumLon / n, sumLat / n]));
        }

        return map;
    }

    /**
     * Update the KPI strip with the resolved figures from the response.
     */
    private static _renderKpi(grid: JQuery<HTMLDivElement>, profile: SpeciesProfileData): void {
        const set = (key: string, value: string): void => {
            grid.find(`[data-kpi="${key}"] .kpi-value`).text(value);
        };

        const from = moment(profile.period_from);
        const to = moment(profile.period_to);
        const period = from.isValid() && to.isValid() ? `${from.format('YYYY-MM-DD')} → ${to.format('YYYY-MM-DD')}` : '–';

        set('period', period);
        set('n', `${profile.n_sightings}`);
        set('total', `${profile.group_size_total}`);
        set('p50', `${profile.group_size_p50.toFixed(1)}`);
        set('p95', `${profile.group_size_p95.toFixed(1)}`);
    }

    /**
     * Monthly bar chart — one bar per YYYY-MM bucket. The list is already
     * sorted by the backend.
     */
    private static _renderMonthly(host: HTMLElement, profile: SpeciesProfileData): void {
        d3.select(host).selectAll('*').remove();
        if (profile.monthly.length === 0) {
            jQuery(host).text(Lang.i().l('No data'));
            return;
        }

        const width = Math.max(320, (host.clientWidth || 600) - 24);
        const height = 200;
        const margin = {top: 12, right: 12, bottom: 48, left: 40};
        const innerW = width - margin.left - margin.right;
        const innerH = height - margin.top - margin.bottom;

        const svg = d3.select(host).append('svg').attr('width', width).attr('height', height);
        const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

        const x = d3.scaleBand().domain(profile.monthly.map((m: {ym: string;}) => m.ym)).range([0, innerW]).padding(0.15);
        const yMax = d3.max(profile.monthly, (m: {count: number;}) => m.count) ?? 1;
        const y = d3.scaleLinear().domain([0, yMax]).nice().range([innerH, 0]);

        g.append('g')
            .attr('transform', `translate(0,${innerH})`)
            .call(d3.axisBottom(x).tickValues(SpeciesProfile._everyNthTick(profile.monthly.map((m: {ym: string;}) => m.ym), 3)))
            .selectAll('text')
            .attr('transform', 'rotate(-45)')
            .style('text-anchor', 'end');
        g.append('g').call(d3.axisLeft(y).ticks(4));

        g.selectAll('rect')
            .data(profile.monthly)
            .enter()
            .append('rect')
            .attr('x', (m: {ym: string;}) => x(m.ym))
            .attr('width', x.bandwidth())
            .attr('y', (m: {count: number;}) => y(m.count))
            .attr('height', (m: {count: number;}) => innerH - y(m.count))
            .attr('fill', '#2471A3')
            .append('title')
            .text((m: {ym: string; count: number;}) => `${m.ym}: ${m.count}`);
    }

    /**
     * Hourly bar chart — 24 fixed bars 0..23.
     */
    private static _renderHourly(host: HTMLElement, profile: SpeciesProfileData): void {
        d3.select(host).selectAll('*').remove();
        if (profile.n_sightings === 0) {
            jQuery(host).text(Lang.i().l('No data'));
            return;
        }

        const width = Math.max(320, (host.clientWidth || 600) - 24);
        const height = 200;
        const margin = {top: 12, right: 12, bottom: 28, left: 40};
        const innerW = width - margin.left - margin.right;
        const innerH = height - margin.top - margin.bottom;

        const svg = d3.select(host).append('svg').attr('width', width).attr('height', height);
        const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

        const x = d3.scaleBand().domain(profile.hourly.map((h: {hour: number;}) => `${h.hour}`)).range([0, innerW]).padding(0.1);
        const yMax = d3.max(profile.hourly, (h: {count: number;}) => h.count) ?? 1;
        const y = d3.scaleLinear().domain([0, yMax]).nice().range([innerH, 0]);

        g.append('g')
            .attr('transform', `translate(0,${innerH})`)
            .call(d3.axisBottom(x).tickValues(['0', '3', '6', '9', '12', '15', '18', '21']));
        g.append('g').call(d3.axisLeft(y).ticks(4));

        g.selectAll('rect')
            .data(profile.hourly)
            .enter()
            .append('rect')
            .attr('x', (h: {hour: number;}) => x(`${h.hour}`))
            .attr('width', x.bandwidth())
            .attr('y', (h: {count: number;}) => y(h.count))
            .attr('height', (h: {count: number;}) => innerH - y(h.count))
            .attr('fill', '#85C1E9')
            .append('title')
            .text((h: {hour: number; count: number;}) => `${`${h.hour}`.padStart(2, '0')}:00 — ${h.count}`);
    }

    /**
     * Generic histogram for a SpeciesProfileBucket[] list. Empty buckets
     * are still drawn so the X axis labels stay consistent across the
     * Env grid.
     */
    private static _renderBuckets(host: HTMLElement, buckets: SpeciesProfileBucket[], color: string): void {
        d3.select(host).selectAll('*').remove();
        if (buckets.length === 0) {
            jQuery(host).text(Lang.i().l('No data'));
            return;
        }

        const width = Math.max(220, (host.clientWidth || 300) - 16);
        const height = 160;
        const margin = {top: 12, right: 8, bottom: 36, left: 32};
        const innerW = width - margin.left - margin.right;
        const innerH = height - margin.top - margin.bottom;

        const svg = d3.select(host).append('svg').attr('width', width).attr('height', height);
        const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

        const labels = buckets.map((b: SpeciesProfileBucket) =>
            b.bucket_min === b.bucket_max ? `${b.bucket_min}` : `${SpeciesProfile._compact(b.bucket_min)}–${SpeciesProfile._compact(b.bucket_max)}`
        );

        const x = d3.scaleBand().domain(labels).range([0, innerW]).padding(0.1);
        const yMax = d3.max(buckets, (b: SpeciesProfileBucket) => b.count) ?? 1;
        const y = d3.scaleLinear().domain([0, Math.max(1, yMax)]).nice().range([innerH, 0]);

        g.append('g')
            .attr('transform', `translate(0,${innerH})`)
            .call(d3.axisBottom(x))
            .selectAll('text')
            .style('font-size', '10px')
            .attr('transform', 'rotate(-40)')
            .style('text-anchor', 'end');
        g.append('g').call(d3.axisLeft(y).ticks(3)).selectAll('text').style('font-size', '10px');

        g.selectAll('rect')
            .data(buckets)
            .enter()
            .append('rect')
            .attr('x', (_b: SpeciesProfileBucket, i: number) => x(labels[i]))
            .attr('width', x.bandwidth())
            .attr('y', (b: SpeciesProfileBucket) => y(b.count))
            .attr('height', (b: SpeciesProfileBucket) => innerH - y(b.count))
            .attr('fill', color)
            .append('title')
            .text((b: SpeciesProfileBucket, i: number) => `${labels[i]}: ${b.count}`);
    }

    /**
     * Composition card — three progress-bar-style rows for juveniles /
     * calves / newborns presence per sighting.
     */
    private static _renderRatios(host: JQuery<HTMLDivElement>, profile: SpeciesProfileData): void {
        host.empty();

        const total = Math.max(1, profile.group_ratios.total);
        const lang = Lang.i();
        const items: {label: string; count: number; color: string;}[] = [
            {label: lang.l('Juveniles'), count: profile.group_ratios.with_juveniles, color: '#2471A3'},
            {label: lang.l('Calves'), count: profile.group_ratios.with_calves, color: '#85C1E9'},
            {label: lang.l('Newborns'), count: profile.group_ratios.with_newborns, color: '#16a085'}
        ];

        for (const item of items) {
            const pct = (item.count / total) * 100;
            const row = jQuery(
                '<div class="mb-3">' +
                `<div class="d-flex justify-content-between small mb-1"><span>${item.label}</span>` +
                `<span class="text-muted">${item.count} / ${total} · ${pct.toFixed(1)}%</span></div>` +
                '<div class="progress" style="height: 14px;">' +
                `<div class="progress-bar" role="progressbar" style="width: ${pct}%; background: ${item.color};" aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100"></div>` +
                '</div>' +
                '</div>'
            );
            host.append(row);
        }
    }

    /**
     * Pick every Nth label so a busy monthly axis stays readable; always
     * keeps the last label so the chart's right edge is annotated.
     */
    private static _everyNthTick(labels: string[], n: number): string[] {
        const picked: string[] = [];
        for (let i = 0; i < labels.length; i++) {
            if (i % n === 0) {
                picked.push(labels[i]);
            }
        }
        if (labels.length > 0 && picked[picked.length - 1] !== labels[labels.length - 1]) {
            picked.push(labels[labels.length - 1]);
        }
        return picked;
    }

    /**
     * Short-form numeric label — keeps "5000" as "5k", "50000" as "50k",
     * leaves small numbers alone. Used on the env-bucket X axis where the
     * raw m / mg-per-m³ values would overflow.
     */
    private static _compact(n: number): string {
        if (!Number.isFinite(n)) {
            return '∞';
        }
        const abs = Math.abs(n);
        if (abs >= 1000) {
            return `${(n / 1000).toFixed(abs >= 10000 ? 0 : 1)}k`;
        }
        if (abs >= 1) {
            return `${Math.round(n)}`;
        }
        return n.toFixed(2);
    }

}