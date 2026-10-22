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
    SpeciesProfileIcc,
    SpeciesProfileBehaviourCooccurrence,
    SpeciesProfileMonthlyEffort,
    SpeciesProfilePhenology,
    SpeciesProfilePhenologyBin,
    SpeciesProfileTrendPoint,
    SpeciesProfileResponseBin,
    SpeciesProfileSpatial,
    SpeciesProfileYearly
} from '../../Api/Species';
import {Lang} from '../../Lang';
import {BaseMap} from '../../Map/BaseMap';
import {OsmBaseLayer} from '../../Map/Layers/OsmBaseLayer';
import {SightingHeatmapLayer} from '../../Map/Layers/SightingHeatmapLayer';
import {SightingPointsLayer} from '../../Map/Layers/SightingPointsLayer';
import {SpatialGridLayer, SpatialGridMode} from '../../Map/Layers/SpatialGridLayer';
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

    /**
     * Mini map for the KDE utilisation distribution + Getis-Ord Gi* hotspots,
     * its grid layer, and the current render mode. Kept on the instance for
     * disposal + mode toggling.
     */
    protected _spatial: BaseMap | null = null;

    protected _spatialLayer: SpatialGridLayer | null = null;

    protected _spatialMode: SpatialGridMode = 'ud';

    /**
     * Latest fetched profile data. Kept on the instance so the PDF handler
     * can re-render every chart at the print-target container width
     * without a second API round-trip.
     */
    protected _profile: SpeciesProfileData | null = null;

    /**
     * Chart host references — populated in loadContent, consumed by
     * _renderCharts() for both the initial render and the print-mode
     * re-render. JQuery refs are convenient because the render methods
     * accept either HTMLElement (via [0]) or the JQuery wrapper directly.
     */
    protected _hosts: {
        kpiGrid?: JQuery<HTMLDivElement>;
        iccHost?: JQuery<HTMLDivElement>;
        monthlyHost?: JQuery<HTMLDivElement>;
        hourlyHost?: JQuery<HTMLDivElement>;
        sizeHost?: JQuery<HTMLDivElement>;
        ratiosHost?: JQuery<HTMLDivElement>;
        envGrid?: JQuery<HTMLDivElement>;
        respGrid?: JQuery<HTMLDivElement>;
        phenHost?: JQuery<HTMLDivElement>;
        trendHost?: JQuery<HTMLDivElement>;
        chordHost?: JQuery<HTMLDivElement>;
        behaviourHost?: JQuery<HTMLDivElement>;
        reactionHost?: JQuery<HTMLDivElement>;
        movementBody?: JQuery<HTMLDivElement>;
        spueHost?: JQuery<HTMLDivElement>;
        yearlyHost?: JQuery<HTMLDivElement>;
        cooccHost?: JQuery<HTMLDivElement>;
        pressureGrid?: JQuery<HTMLDivElement>;
        envExtraGrid?: JQuery<HTMLDivElement>;
        mapHost?: JQuery<HTMLDivElement>;
        spatialHost?: JQuery<HTMLDivElement>;
        seismicBody?: JQuery<HTMLDivElement>;
    } = {};

    public constructor(speciesId: number) {
        super();
        this._speciesId = speciesId;
    }

    public override async unloadContent(): Promise<void> {
        if (this._heatmap) {
            this._heatmap.unload();
            this._heatmap = null;
        }
        if (this._spatial) {
            this._spatial.unload();
            this._spatial = null;
            this._spatialLayer = null;
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
        kpiCard.getMainElement().addClass('print-include');

        const kpiBody = jQuery('<div class="card-body"/>').appendTo(kpiCard.getBodyElement());
        const kpiGrid = jQuery<HTMLDivElement>(
            '<div class="d-flex flex-wrap" style="gap: 1.5rem;">' +
            `<div class="kpi" data-kpi="period"><div class="kpi-label text-muted small">${lang.l('Period')}</div><div class="kpi-value h5 mb-0">–</div></div>` +
            `<div class="kpi" data-kpi="n"><div class="kpi-label text-muted small">${lang.l('Sightings')}</div><div class="kpi-value h5 mb-0">–</div></div>` +
            `<div class="kpi" data-kpi="tours" title="${lang.l('Distinct tours the sightings came from — the cluster unit. Sightings on one tour are not independent.')}"><div class="kpi-label text-muted small">${lang.l('Unique tours')}</div><div class="kpi-value h5 mb-0">–</div></div>` +
            `<div class="kpi" data-kpi="total"><div class="kpi-label text-muted small">${lang.l('Animals (sum)')}</div><div class="kpi-value h5 mb-0">–</div></div>` +
            `<div class="kpi" data-kpi="p50"><div class="kpi-label text-muted small">${lang.l('Median group')}</div><div class="kpi-value h5 mb-0">–</div></div>` +
            `<div class="kpi" data-kpi="p95"><div class="kpi-label text-muted small">${lang.l('p95 group')}</div><div class="kpi-value h5 mb-0">–</div></div>` +
            '</div>'
        ).appendTo(kpiBody);
        this._hosts.kpiGrid = kpiGrid;

        // PDF export button — sits in the KPI card so it's at the top of
        // the page. Hidden during @media print via the species-profile-export
        // CSS rule.
        const exportWrap = jQuery('<div class="species-profile-export text-right mt-2"/>').appendTo(kpiBody);
        const pdfBtn = jQuery<HTMLButtonElement>(
            '<button type="button" class="btn btn-primary btn-sm">'
            + `<i class="fa fa-file-pdf"></i> ${SpeciesProfile._escape(lang.l('Generate PDF'))}`
            + '</button>'
        ).appendTo(exportWrap);

        pdfBtn.on('click', async() => {
            if (!this._profile) {
                return;
            }
            const originalLabel = pdfBtn.html();
            pdfBtn.prop('disabled', true);
            pdfBtn.html(
                `<i class="fa fa-spinner fa-spin"></i> ${SpeciesProfile._escape(lang.l('Generating…'))}`
            );
            try {
                await this._generatePdf();
            } catch (e) {
                console.error('[Species profile PDF] generate failed', e);
                window.alert(`${lang.l('Download failed')}: ${(e as Error).message}`);
            } finally {
                pdfBtn.html(originalLabel);
                pdfBtn.prop('disabled', false);
            }
        });

        // Row 1b — tour clustering (ICC), pseudo-replication diagnostic ------------------------------------------------

        const rowIcc = new ContentRow(this._wrapper.getContentWrapper().getContent());
        const iccCard = new Card(new ContentCol(rowIcc, ContentColSize.col12));
        iccCard.setTitle(new LangText('Tour clustering (ICC)'));
        const iccHost = jQuery<HTMLDivElement>('<div class="species-profile-icc card-body"/>').appendTo(iccCard.getBodyElement());
        this._hosts.iccHost = iccHost;

        // Row 2 — time distribution (monthly + hourly side-by-side) ---------------------------------------------------

        const rowTime = new ContentRow(this._wrapper.getContentWrapper().getContent());
        const monthlyCard = new Card(new ContentCol(rowTime, ContentColSize.colMd6));
        monthlyCard.setTitle(new LangText('Sightings per month'));
        SpeciesProfile._attachInfo(monthlyCard, 'Sightings per month', 'desc.monthly');
        const monthlyHost = jQuery<HTMLDivElement>('<div class="species-profile-chart"/>').appendTo(monthlyCard.getBodyElement());
        this._hosts.monthlyHost = monthlyHost;

        const hourlyCard = new Card(new ContentCol(rowTime, ContentColSize.colMd6));
        hourlyCard.setTitle(new LangText('Sightings per hour-of-day'));
        SpeciesProfile._attachInfo(hourlyCard, 'Sightings per hour-of-day', 'desc.hourly');
        const hourlyHost = jQuery<HTMLDivElement>('<div class="species-profile-chart"/>').appendTo(hourlyCard.getBodyElement());
        this._hosts.hourlyHost = hourlyHost;

        // Row 2b — seasonality (phenology polar) + yearly SPUE trend --------------------------------------------------

        const rowPhen = new ContentRow(this._wrapper.getContentWrapper().getContent());
        const phenCard = new Card(new ContentCol(rowPhen, ContentColSize.colMd6));
        phenCard.setTitle(new LangText('Seasonality (effort-corrected)'));
        const phenHost = jQuery<HTMLDivElement>('<div class="species-profile-chart"/>').appendTo(phenCard.getBodyElement());
        this._hosts.phenHost = phenHost;

        const trendCard = new Card(new ContentCol(rowPhen, ContentColSize.colMd6));
        trendCard.setTitle(new LangText('Yearly SPUE trend'));
        const trendHost = jQuery<HTMLDivElement>('<div class="species-profile-chart"/>').appendTo(trendCard.getBodyElement());
        this._hosts.trendHost = trendHost;

        // Row 3 — group size + ratios ---------------------------------------------------------------------------------

        const rowGroup = new ContentRow(this._wrapper.getContentWrapper().getContent());
        const sizeCard = new Card(new ContentCol(rowGroup, ContentColSize.colMd6));
        sizeCard.setTitle(new LangText('Group size distribution'));
        SpeciesProfile._attachInfo(sizeCard, 'Group size distribution', 'desc.group_size');
        const sizeHost = jQuery<HTMLDivElement>('<div class="species-profile-chart"/>').appendTo(sizeCard.getBodyElement());
        this._hosts.sizeHost = sizeHost;

        const ratiosCard = new Card(new ContentCol(rowGroup, ContentColSize.colMd6));
        ratiosCard.setTitle(new LangText('Composition (sightings reporting …)'));
        SpeciesProfile._attachInfo(ratiosCard, 'Composition (sightings reporting …)', 'desc.group_ratios');
        const ratiosHost = jQuery<HTMLDivElement>('<div class="species-profile-ratios card-body"/>').appendTo(ratiosCard.getBodyElement());
        this._hosts.ratiosHost = ratiosHost;

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
        this._hosts.envGrid = envGrid;

        // Row 4b — environmental response curves (target-group, effort-corrected) -------------------------------------

        const rowResp = new ContentRow(this._wrapper.getContentWrapper().getContent());
        const respCard = new Card(new ContentCol(rowResp, ContentColSize.col12));
        respCard.setTitle(new LangText('Environmental response (effort-corrected)'));
        jQuery('<div class="species-profile-print-desc text-muted small p-2"/>')
            .text(lang.l('Target species’ share of ALL sightings per environment bin (background = where surveying happened), with a Wilson 95% band. Unlike the raw histograms above, this is not inflated by how much was surveyed at each value.'))
            .appendTo(respCard.getBodyElement());
        const respGrid = jQuery<HTMLDivElement>(
            '<div class="row p-2">' +
            `<div class="col-md-3"><div class="text-muted small">${lang.l('Distance to coast (m)')}</div><div class="species-profile-chart" data-resp="distance"></div></div>` +
            `<div class="col-md-3"><div class="text-muted small">${lang.l('Sea depth (m)')}</div><div class="species-profile-chart" data-resp="depth"></div></div>` +
            `<div class="col-md-3"><div class="text-muted small">${lang.l('SST (°C)')}</div><div class="species-profile-chart" data-resp="sst"></div></div>` +
            `<div class="col-md-3"><div class="text-muted small">${lang.l('Chl-a (mg/m³)')}</div><div class="species-profile-chart" data-resp="chl"></div></div>` +
            '</div>'
        ).appendTo(respCard.getBodyElement());
        this._hosts.respGrid = respGrid;

        // Row 5 — behaviour + reaction donuts -------------------------------------------------------------------------

        const rowBeh = new ContentRow(this._wrapper.getContentWrapper().getContent());
        const behaviourCard = new Card(new ContentCol(rowBeh, ContentColSize.colMd6));
        behaviourCard.setTitle(new LangText('Behaviour mix'));
        SpeciesProfile._attachInfo(behaviourCard, 'Behaviour mix', 'desc.behaviour');
        const behaviourHost = jQuery<HTMLDivElement>('<div class="species-profile-chart"/>').appendTo(behaviourCard.getBodyElement());
        this._hosts.behaviourHost = behaviourHost;

        const reactionCard = new Card(new ContentCol(rowBeh, ContentColSize.colMd6));
        reactionCard.setTitle(new LangText('Reaction to boat'));
        SpeciesProfile._attachInfo(reactionCard, 'Reaction to boat', 'desc.reaction');
        const reactionHost = jQuery<HTMLDivElement>('<div class="species-profile-chart"/>').appendTo(reactionCard.getBodyElement());
        this._hosts.reactionHost = reactionHost;

        // Row 5b — behaviour co-occurrence chord ----------------------------------------------------------------------

        const rowChord = new ContentRow(this._wrapper.getContentWrapper().getContent());
        const chordCard = new Card(new ContentCol(rowChord, ContentColSize.col12));
        chordCard.setTitle(new LangText('Behaviour co-occurrence'));
        jQuery('<div class="species-profile-print-desc text-muted small p-2"/>')
            .text(lang.l('Which behaviours were recorded together in the same sighting (ribbon width = shared sightings). Co-occurrence, not a behavioural sequence.'))
            .appendTo(chordCard.getBodyElement());
        const chordHost = jQuery<HTMLDivElement>('<div class="species-profile-chart" style="text-align:center;"/>').appendTo(chordCard.getBodyElement());
        this._hosts.chordHost = chordHost;

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
        this._hosts.movementBody = movementBody;

        // Row 7 — SPUE (Sightings Per Unit Effort) --------------------------------------------------------------------

        const rowSpue = new ContentRow(this._wrapper.getContentWrapper().getContent());
        const spueCard = new Card(new ContentCol(rowSpue, ContentColSize.col12));
        spueCard.setTitle(new LangText('Sightings per tour-hour (SPUE)'));
        SpeciesProfile._attachInfo(spueCard, 'Sightings per tour-hour (SPUE)', 'desc.spue');
        const spueHost = jQuery<HTMLDivElement>('<div class="species-profile-chart"/>').appendTo(spueCard.getBodyElement());
        this._hosts.spueHost = spueHost;

        // Row 8 — yearly trend ----------------------------------------------------------------------------------------

        const rowYearly = new ContentRow(this._wrapper.getContentWrapper().getContent());
        const yearlyCard = new Card(new ContentCol(rowYearly, ContentColSize.colMd6));
        yearlyCard.setTitle(new LangText('Sightings per year'));
        SpeciesProfile._attachInfo(yearlyCard, 'Sightings per year', 'desc.yearly');
        const yearlyHost = jQuery<HTMLDivElement>('<div class="species-profile-chart"/>').appendTo(yearlyCard.getBodyElement());
        this._hosts.yearlyHost = yearlyHost;

        // Co-occurrence card next to yearly
        const cooccCard = new Card(new ContentCol(rowYearly, ContentColSize.colMd6));
        cooccCard.setTitle(new LangText('Co-occurring species (same tour)'));
        SpeciesProfile._attachInfo(cooccCard, 'Co-occurring species (same tour)', 'desc.cooccurrence');
        const cooccHost = jQuery<HTMLDivElement>('<div class="species-profile-chart"/>').appendTo(cooccCard.getBodyElement());
        this._hosts.cooccHost = cooccHost;

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
        this._hosts.pressureGrid = pressureGrid;

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
            `<div class="col-md-2-4"><div class="text-muted small">${lang.l('Region current (m/s)')}</div><div class="species-profile-chart" data-envx="current_region"></div></div>` +
            `<div class="col-md-2-4"><div class="text-muted small">${lang.l('Coastal current (m/s, ±)')}</div><div class="species-profile-chart" data-envx="current_coastal"></div></div>` +
            `<div class="col-md-2-4"><div class="text-muted small">${lang.l('Wave height (m)')}</div><div class="species-profile-chart" data-envx="wave"></div></div>` +
            `<div class="col-md-2-4"><div class="text-muted small">${lang.l('UV index')}</div><div class="species-profile-chart" data-envx="uv"></div></div>` +
            `<div class="col-md-2-4"><div class="text-muted small">${lang.l('Wind speed (m/s)')}</div><div class="species-profile-chart" data-envx="wind"></div></div>` +
            '</div>' +
            // Custom 5-column row helper — Bootstrap 4 doesn't ship col-md-2-4,
            // so define it inline to avoid touching the global stylesheet.
            '<style>.col-md-2-4{flex:0 0 20%;max-width:20%;padding-right:7.5px;padding-left:7.5px;}</style>'
        ).appendTo(envExtraCard.getBodyElement());
        this._hosts.envExtraGrid = envExtraGrid;

        // Row 11 — spatial heatmap ------------------------------------------------------------------------------------

        const rowMap = new ContentRow(this._wrapper.getContentWrapper().getContent());
        const mapCard = new Card(new ContentCol(rowMap, ContentColSize.col12));
        mapCard.setTitle(new LangText('Spatial distribution'));
        SpeciesProfile._attachInfo(mapCard, 'Spatial distribution', 'desc.heatmap');
        const mapHost = jQuery<HTMLDivElement>('<div class="species-profile-map" style="height: 360px;"/>').appendTo(mapCard.getBodyElement());
        this._hosts.mapHost = mapHost;

        // Row 11b — KDE utilisation distribution + Getis-Ord Gi* hotspots ---------------------------------------------

        const rowSpatial = new ContentRow(this._wrapper.getContentWrapper().getContent());
        const spatialCard = new Card(new ContentCol(rowSpatial, ContentColSize.col12));
        spatialCard.setTitle(new LangText('Hotspots & utilization distribution'));

        const spatialBar = jQuery('<div style="display:flex;align-items:center;gap:12px;margin-bottom:8px;flex-wrap:wrap;"/>').appendTo(spatialCard.getBodyElement());
        const spatialToggle = jQuery(
            '<div class="btn-group btn-group-sm" role="group">'
            + `<button type="button" class="btn btn-primary" data-sp-mode="ud">${lang.l('Utilization (50/95%)')}</button>`
            + `<button type="button" class="btn btn-default" data-sp-mode="gi">${lang.l('Gi* hotspots')}</button>`
            + '</div>'
        ).appendTo(spatialBar);
        jQuery('<div class="species-profile-print-desc text-muted small" style="flex:1;min-width:200px;"/>')
            .text(lang.l('Red = 50% core / 95% home-range (UD) or significant Gi* hot spot (z≥1.96); blue = Gi* cold spot. Kernel density over all positioned sightings.'))
            .appendTo(spatialBar);
        const spatialHost = jQuery<HTMLDivElement>('<div class="species-profile-map" style="height: 360px;"/>').appendTo(spatialCard.getBodyElement());
        this._hosts.spatialHost = spatialHost;

        spatialToggle.find('[data-sp-mode]').on('click', (ev) => {
            const mode = (jQuery(ev.currentTarget).attr('data-sp-mode') ?? 'ud') === 'gi' ? 'gi' : 'ud';
            this._spatialMode = mode;
            spatialToggle.find('[data-sp-mode]').removeClass('btn-primary').addClass('btn-default');
            jQuery(ev.currentTarget).removeClass('btn-default').addClass('btn-primary');
            if (this._spatialLayer) {
                this._spatialLayer.setMode(mode);
            }
        });

        // Row 12 — seismic exposure -----------------------------------------------------------------------------------

        const rowSeismic = new ContentRow(this._wrapper.getContentWrapper().getContent());
        const seismicCard = new Card(new ContentCol(rowSeismic, ContentColSize.col12));
        seismicCard.setTitle(new LangText('Seismic exposure'));
        SpeciesProfile._attachInfo(seismicCard, 'Seismic exposure', 'desc.seismic');

        const seismicBody = jQuery<HTMLDivElement>(
            '<div class="row p-2">' +
            '<div class="col-md-4 d-flex flex-wrap" style="gap: 1.25rem;">' +
            `<div class="kpi" data-skpi="n"><div class="kpi-label text-muted small">${lang.l('Sightings w/ event')}</div><div class="kpi-value h5 mb-0">–</div></div>` +
            `<div class="kpi" data-skpi="pairs"><div class="kpi-label text-muted small">${lang.l('Sighting × event pairs')}</div><div class="kpi-value h5 mb-0">–</div></div>` +
            `<div class="kpi" data-skpi="maxmag"><div class="kpi-label text-muted small">${lang.l('Max magnitude')}</div><div class="kpi-value h5 mb-0">–</div></div>` +
            `<div class="kpi" data-skpi="dist"><div class="kpi-label text-muted small">${lang.l('Median distance')}</div><div class="kpi-value h5 mb-0">–</div></div>` +
            '</div>' +
            `<div class="col-md-8 row"><div class="col-md-4"><div class="text-muted small">${lang.l('Magnitude')}</div><div class="species-profile-chart" data-seismic="mag"></div></div>` +
            `<div class="col-md-4"><div class="text-muted small">${lang.l('Distance to epicenter (km)')}</div><div class="species-profile-chart" data-seismic="dist"></div></div>` +
            `<div class="col-md-4"><div class="text-muted small">${lang.l('Offset (h, +event before sighting)')}</div><div class="species-profile-chart" data-seismic="offset"></div></div>` +
            '</div></div>'
        ).appendTo(seismicCard.getBodyElement());
        this._hosts.seismicBody = seismicBody;

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

                this._profile = profile;
                this._renderCharts({recreateHeatmap: true});
                Lang.i().lAll();
            } finally {
                kpiCard.hideLoading();
            }
        };

        this._onLoadTable();
    }

    /**
     * Walk through every chart host and re-render with the current
     * `this._profile`. Used both on initial fetch and on entering print
     * mode (so the d3 charts re-measure their constrained container width).
     *
     * `recreateHeatmap: true` tears down the OL map and rebuilds it from
     * scratch — only required on the first render (when no map exists yet).
     * For subsequent re-renders we call `updateSize()` on the existing map
     * which is much faster and avoids a tile-flicker.
     */
    protected _renderCharts(opts: {recreateHeatmap: boolean;}): void {
        const profile = this._profile;
        if (!profile) {
            return;
        }
        const h = this._hosts;

        if (h.kpiGrid) {
            SpeciesProfile._renderKpi(h.kpiGrid, profile);
        }
        if (h.iccHost) {
            SpeciesProfile._renderIcc(h.iccHost, profile);
        }
        if (h.monthlyHost) {
            SpeciesProfile._renderMonthly(h.monthlyHost[0] as HTMLElement, profile);
        }
        if (h.hourlyHost) {
            SpeciesProfile._renderHourly(h.hourlyHost[0] as HTMLElement, profile);
        }
        if (h.phenHost) {
            SpeciesProfile._renderPhenologyPolar(h.phenHost[0] as HTMLElement, profile.phenology ? profile.phenology.bins : []);
        }
        if (h.trendHost) {
            SpeciesProfile._renderYearlyTrend(h.trendHost[0] as HTMLElement, profile.phenology);
        }
        if (h.sizeHost) {
            SpeciesProfile._renderBuckets(h.sizeHost[0] as HTMLElement, profile.group_size, '#2471A3');
        }
        if (h.ratiosHost) {
            SpeciesProfile._renderRatios(h.ratiosHost, profile);
        }

        if (h.envGrid) {
            h.envGrid.find('[data-env="distance"]').each((_i, el) => {
                SpeciesProfile._renderBuckets(el as HTMLElement, profile.env.distance_coast_m, '#17a2b8');
            });
            h.envGrid.find('[data-env="depth"]').each((_i, el) => {
                SpeciesProfile._renderBuckets(el as HTMLElement, profile.env.depth_m, '#6f42c1');
            });
            h.envGrid.find('[data-env="sst"]').each((_i, el) => {
                SpeciesProfile._renderBuckets(el as HTMLElement, profile.env.sst_c, '#dc3545');
            });
            h.envGrid.find('[data-env="chl"]').each((_i, el) => {
                SpeciesProfile._renderBuckets(el as HTMLElement, profile.env.chl_a_mg_m3, '#28a745');
            });
        }

        if (h.respGrid) {
            const resp = profile.response;
            h.respGrid.find('[data-resp="distance"]').each((_i, el) => {
                SpeciesProfile._renderResponseCurve(el as HTMLElement, resp ? resp.distance_coast_m : []);
            });
            h.respGrid.find('[data-resp="depth"]').each((_i, el) => {
                SpeciesProfile._renderResponseCurve(el as HTMLElement, resp ? resp.depth_m : []);
            });
            h.respGrid.find('[data-resp="sst"]').each((_i, el) => {
                SpeciesProfile._renderResponseCurve(el as HTMLElement, resp ? resp.sst_c : []);
            });
            h.respGrid.find('[data-resp="chl"]').each((_i, el) => {
                SpeciesProfile._renderResponseCurve(el as HTMLElement, resp ? resp.chl_a : []);
            });
        }

        if (h.behaviourHost) {
            SpeciesProfile._renderDonut(h.behaviourHost[0] as HTMLElement, profile.behaviour_mix);
        }
        if (h.reactionHost) {
            SpeciesProfile._renderDonut(h.reactionHost[0] as HTMLElement, profile.reaction_mix);
        }
        if (h.chordHost) {
            SpeciesProfile._renderBehaviourChord(h.chordHost[0] as HTMLElement, profile.behaviour_cooccurrence);
        }

        if (h.movementBody) {
            SpeciesProfile._renderMovementKpi(h.movementBody, profile);
            h.movementBody.find('[data-rose]').each((_i, el) => {
                SpeciesProfile._renderHeadingRose(el as HTMLElement, profile.movement.heading_rose);
            });
        }

        if (h.spueHost) {
            SpeciesProfile._renderSpue(h.spueHost[0] as HTMLElement, profile.monthly_effort);
        }
        if (h.yearlyHost) {
            SpeciesProfile._renderYearly(h.yearlyHost[0] as HTMLElement, profile.yearly);
        }
        if (h.cooccHost) {
            SpeciesProfile._renderCooccurrence(h.cooccHost[0] as HTMLElement, profile.cooccurrence);
        }

        if (h.pressureGrid) {
            h.pressureGrid.find('[data-press="beaufort"]').each((_i, el) => {
                SpeciesProfile._renderBuckets(el as HTMLElement, profile.pressure.beaufort, '#0d6efd');
            });
            h.pressureGrid.find('[data-press="boats"]').each((_i, el) => {
                SpeciesProfile._renderBuckets(el as HTMLElement, profile.pressure.other_boats, '#fd7e14');
            });
            h.pressureGrid.find('[data-press="fishing"]').each((_i, el) => {
                SpeciesProfile._renderBuckets(el as HTMLElement, profile.pressure.fishing_hours_25km, '#c14953');
            });
        }

        if (h.envExtraGrid) {
            h.envExtraGrid.find('[data-envx="salinity"]').each((_i, el) => {
                SpeciesProfile._renderBuckets(el as HTMLElement, profile.env_extra.salinity_psu, '#264653');
            });
            h.envExtraGrid.find('[data-envx="sla"]').each((_i, el) => {
                SpeciesProfile._renderBuckets(el as HTMLElement, profile.env_extra.sla_cm, '#4a90c2');
            });
            h.envExtraGrid.find('[data-envx="current"]').each((_i, el) => {
                SpeciesProfile._renderBuckets(el as HTMLElement, profile.env_extra.current_speed_m_s, '#1d6f8a');
            });
            h.envExtraGrid.find('[data-envx="current_region"]').each((_i, el) => {
                SpeciesProfile._renderBuckets(el as HTMLElement, profile.env_extra.current_region_speed_m_s, '#14566b');
            });
            h.envExtraGrid.find('[data-envx="current_coastal"]').each((_i, el) => {
                SpeciesProfile._renderBuckets(el as HTMLElement, profile.env_extra.current_coastal_component_m_s, '#0f7b8a');
            });
            h.envExtraGrid.find('[data-envx="wave"]').each((_i, el) => {
                SpeciesProfile._renderBuckets(el as HTMLElement, profile.env_extra.wave_height_m, '#2a9d8f');
            });
            h.envExtraGrid.find('[data-envx="uv"]').each((_i, el) => {
                SpeciesProfile._renderBuckets(el as HTMLElement, profile.env_extra.uv_index, '#d4a017');
            });
            h.envExtraGrid.find('[data-envx="wind"]').each((_i, el) => {
                SpeciesProfile._renderBuckets(el as HTMLElement, profile.env_extra.wind_speed_m_s, '#6a5acd');
            });
        }

        if (h.mapHost) {
            if (opts.recreateHeatmap || !this._heatmap) {
                this._heatmap = SpeciesProfile._renderHeatmap(h.mapHost[0] as HTMLElement, profile.heatmap, this._heatmap);
            } else {
                // Cheap path on print-mode toggle: keep the existing map,
                // just nudge OL to re-measure the container.
                this._heatmap.updateSize();
            }
        }

        if (h.spatialHost) {
            if (opts.recreateHeatmap || !this._spatial) {
                const built = this._renderSpatial(h.spatialHost[0] as HTMLElement, profile.spatial, this._spatial);
                this._spatial = built.map;
                this._spatialLayer = built.layer;
            } else {
                this._spatial.updateSize();
            }
        }

        if (h.seismicBody) {
            SpeciesProfile._renderSeismicKpi(h.seismicBody, profile);
            h.seismicBody.find('[data-seismic="mag"]').each((_i, el) => {
                SpeciesProfile._renderBuckets(el as HTMLElement, profile.seismic.magnitude, '#dc3545');
            });
            h.seismicBody.find('[data-seismic="dist"]').each((_i, el) => {
                SpeciesProfile._renderBuckets(el as HTMLElement, profile.seismic.distance_km, '#fd7e14');
            });
            h.seismicBody.find('[data-seismic="offset"]').each((_i, el) => {
                SpeciesProfile._renderBuckets(el as HTMLElement, profile.seismic.hours_offset, '#6f42c1');
            });
        }
    }

    /**
     * Drive the browser's print dialog with `mwpa-print-mode` +
     * `mwpa-print-mode-profile` on body. The print stylesheet pins the
     * content area to A4-landscape printable width, reveals the hidden
     * `species-profile-print-desc` blocks, and applies `page-break-inside:
     * avoid` per card so charts don't get split across pages. Charts are
     * re-rendered once before printing (so d3 picks up the new container
     * width) and again on cleanup (back to dashboard width).
     */
    protected async _generatePdf(): Promise<void> {
        const $body = jQuery('body');
        $body.addClass('mwpa-print-mode mwpa-print-mode-profile');

        // Layout settle: requestAnimationFrame guarantees the new CSS
        // width has been applied before d3 re-measures host.clientWidth.
        await new Promise<void>((resolve) => {
            window.requestAnimationFrame(() => resolve());
        });

        this._renderCharts({recreateHeatmap: false});

        // Give OL a moment to fetch tiles for the new viewport size. The
        // fixed timeout is the same belt-and-braces wait used by the
        // Sighting Datenblatt flow.
        await new Promise<void>((resolve) => {
            window.setTimeout(resolve, 800);
        });

        const cleanup = (): void => {
            $body.removeClass('mwpa-print-mode mwpa-print-mode-profile');
            window.removeEventListener('afterprint', cleanup);
            // Re-render at the on-screen layout's wider container width.
            this._renderCharts({recreateHeatmap: false});
        };
        window.addEventListener('afterprint', cleanup);

        try {
            window.print();
        } finally {
            // Belt-and-braces: some browsers don't fire afterprint reliably.
            window.setTimeout(cleanup, 1500);
        }
    }

    private static _escape(s: string): string {
        return s.replace(/[&<>"']/gu, (ch) =>
            ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', '\'': '&#39;'})[ch] ?? ch);
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
     *
     * Side-effects beyond the popover: tags the card with `print-include`
     * so the print stylesheet can target it, and prepends a hidden
     * `species-profile-print-desc` block to the card body. The block is
     * invisible on screen and revealed only when body has
     * `mwpa-print-mode-profile` so the PDF reader can interpret the chart
     * without opening the (i) popover.
     */
    private static _attachInfo(card: Card, titleKey: string, descKey: string): void {
        const lang = Lang.i();
        const tools = card.getToolsElement();
        const escape = (s: string): string => s.replace(/[&<>"']/g, (ch) =>
            ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', '\'': '&#39;'})[ch] ?? ch);

        card.getMainElement().addClass('print-include');

        jQuery('<div class="species-profile-print-desc"/>')
            .text(lang.l(descKey))
            .appendTo(card.getBodyElement());

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
     * KPI cells for the seismic-exposure card. Same wiring pattern as
     * _renderMovementKpi — fills `[data-skpi="…"] .kpi-value` text in
     * place so the card structure stays declarative.
     */
    private static _renderSeismicKpi(host: JQuery<HTMLDivElement>, profile: SpeciesProfileData): void {
        const set = (key: string, value: string): void => {
            host.find(`[data-skpi="${key}"] .kpi-value`).text(value);
        };
        const s = profile.seismic;
        set('n', `${s.n_sightings_with_event}`);
        set('pairs', `${s.n_correlations}`);
        set('maxmag', s.n_correlations > 0 ? `M ${s.max_magnitude.toFixed(1)}` : '–');
        set('dist', s.n_correlations > 0 ? `${s.median_distance_km.toFixed(0)} km` : '–');
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
     * Mini-map for the KDE utilisation distribution + Getis-Ord Gi* hotspot
     * grid. Disposes any previous instance, shows a hint when the server had
     * too few positioned sightings to estimate, and returns the map + grid
     * layer so the mode toggle can flip it without a rebuild.
     */
    protected _renderSpatial(
        host: HTMLElement,
        spatial: SpeciesProfileSpatial | undefined,
        prev: BaseMap | null
    ): {map: BaseMap | null; layer: SpatialGridLayer | null;} {
        if (prev) {
            prev.unload();
        }
        jQuery(host).empty();

        if (!spatial || spatial.cells.length === 0) {
            jQuery(host).css('height', 'auto').text(
                Lang.i().l('Too few positioned sightings for a spatial estimate (need at least 10).')
            );
            return {map: null, layer: null};
        }

        const map = new BaseMap(jQuery(host));
        map.setHeight(360);
        map.load({initialCenterLonLat: [0, 0], initialZoom: 2});
        map.addLayer(new OsmBaseLayer());

        const grid = new SpatialGridLayer();
        map.addLayer(grid);
        grid.setCells(spatial.cells, spatial.cell_lon_deg, spatial.cell_lat_deg);
        grid.setMode(this._spatialMode);
        grid.refresh();

        const centreLon = (spatial.min_lon + spatial.max_lon) / 2;
        const centreLat = (spatial.min_lat + spatial.max_lat) / 2;
        map.setView(fromLonLat([centreLon, centreLat]), 8);

        return {map: map, layer: grid};
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
        set('tours', `${profile.n_unique_tours}`);
        set('total', `${profile.group_size_total}`);
        set('p50', `${profile.group_size_p50.toFixed(1)}`);
        set('p95', `${profile.group_size_p95.toFixed(1)}`);
    }

    /**
     * Tour-clustering (ICC) card — one labelled bar per metric showing the
     * share of its variance that is between-tour. A one-line explanation sits
     * on top; an empty list means there were too few tours to decompose.
     */
    private static _renderIcc(host: JQuery<HTMLDivElement>, profile: SpeciesProfileData): void {
        const lang = Lang.i();
        host.empty();

        jQuery('<div class="species-profile-print-desc text-muted small mb-2"/>')
            .text(lang.l('Share of each metric’s variance that is between-tour rather than within-tour. High values mean sightings cluster by tour — treat them as non-independent (use tour as a random effect in any model).'))
            .appendTo(host);

        const items: SpeciesProfileIcc[] = profile.icc ?? [];
        if (items.length === 0) {
            jQuery('<div class="text-muted"/>')
                .text(lang.l('Too few tours to estimate (need at least two tours per metric).'))
                .appendTo(host);
            return;
        }

        const colorFor = (v: number): string => v >= 0.3 ? '#dc3545' : (v >= 0.1 ? '#f0ad4e' : '#28a745');

        const table = jQuery('<div style="display:flex;flex-direction:column;gap:4px;"/>').appendTo(host);
        for (const it of items) {
            const row = jQuery('<div style="display:flex;align-items:center;gap:8px;"/>').appendTo(table);
            jQuery('<div style="flex:0 0 140px;" class="small"/>').text(lang.l(it.label)).appendTo(row);
            const barWrap = jQuery('<div style="flex:1;background:#eee;border-radius:3px;height:14px;overflow:hidden;"/>').appendTo(row);
            const pct = Math.round(Math.max(0, Math.min(1, it.icc)) * 100);
            jQuery(`<div style="height:100%;width:${pct}%;background:${colorFor(it.icc)};"/>`).appendTo(barWrap);
            jQuery('<div style="flex:0 0 160px;text-align:right;" class="small text-muted"/>')
                .text(`${it.icc.toFixed(2)}  (${it.n_obs} obs / ${it.n_tours} tours)`)
                .appendTo(row);
        }
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
     * Target-group response curve: the species' proportion of all sightings
     * per environment bin (line) with its Wilson 95 % band. y-axis is a
     * percentage; x-axis the environment bins.
     */
    private static _renderResponseCurve(host: HTMLElement, bins: SpeciesProfileResponseBin[]): void {
        d3.select(host).selectAll('*').remove();
        if (bins.length === 0) {
            jQuery(host).text(Lang.i().l('No data'));
            return;
        }

        const width = Math.max(220, (host.clientWidth || 300) - 16);
        const height = 160;
        const margin = {top: 12, right: 8, bottom: 36, left: 38};
        const innerW = width - margin.left - margin.right;
        const innerH = height - margin.top - margin.bottom;

        const svg = d3.select(host).append('svg').attr('width', width).attr('height', height);
        const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

        const labels = bins.map((b: SpeciesProfileResponseBin) =>
            b.bucket_min === b.bucket_max
                ? `${SpeciesProfile._compact(b.bucket_min)}+`
                : `${SpeciesProfile._compact(b.bucket_min)}–${SpeciesProfile._compact(b.bucket_max)}`);

        const x = d3.scalePoint().domain(labels).range([0, innerW]).padding(0.5);
        const yMax = Math.min(1, Math.max(0.05, d3.max(bins, (b: SpeciesProfileResponseBin) => b.ci_hi) ?? 0.1));
        const y = d3.scaleLinear().domain([0, yMax]).nice().range([innerH, 0]);

        g.append('g')
            .attr('transform', `translate(0,${innerH})`)
            .call(d3.axisBottom(x))
            .selectAll('text')
            .style('font-size', '9px')
            .attr('transform', 'rotate(-40)')
            .style('text-anchor', 'end');
        g.append('g').call(d3.axisLeft(y).ticks(4).tickFormat((d: number) => `${Math.round(d * 100)}%`));

        const area = d3.area()
            .x((_d: SpeciesProfileResponseBin, i: number) => x(labels[i]))
            .y0((d: SpeciesProfileResponseBin) => y(d.ci_lo))
            .y1((d: SpeciesProfileResponseBin) => y(d.ci_hi));
        g.append('path').datum(bins).attr('fill', 'rgba(36,113,163,0.18)').attr('d', area);

        const line = d3.line()
            .x((_d: SpeciesProfileResponseBin, i: number) => x(labels[i]))
            .y((d: SpeciesProfileResponseBin) => y(d.proportion));
        g.append('path').datum(bins).attr('fill', 'none').attr('stroke', '#2471A3').attr('stroke-width', 1.5).attr('d', line);

        g.selectAll('circle')
            .data(bins)
            .enter()
            .append('circle')
            .attr('cx', (_d: SpeciesProfileResponseBin, i: number) => x(labels[i]))
            .attr('cy', (d: SpeciesProfileResponseBin) => y(d.proportion))
            .attr('r', 2.5)
            .attr('fill', '#2471A3')
            .append('title')
            .text((d: SpeciesProfileResponseBin, i: number) =>
                `${labels[i]}: ${(d.proportion * 100).toFixed(1)}% (${d.n_target}/${d.n_total})`);
    }

    /**
     * Phenology polar (rose) plot: one wedge per calendar month, radius ∝
     * effort-corrected SPUE. Jan at the top, clockwise.
     */
    private static _renderPhenologyPolar(host: HTMLElement, bins: SpeciesProfilePhenologyBin[]): void {
        d3.select(host).selectAll('*').remove();
        if (bins.length === 0 || bins.every((b: SpeciesProfilePhenologyBin) => b.spue === 0)) {
            jQuery(host).text(Lang.i().l('No effort data for a seasonal estimate'));
            return;
        }

        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const size = Math.max(220, Math.min(300, (host.clientWidth || 280) - 16));
        const radius = (size / 2) - 26;
        const svg = d3.select(host).append('svg').attr('width', size).attr('height', size);
        const g = svg.append('g').attr('transform', `translate(${size / 2},${size / 2})`);

        const maxSpue = Math.max(...bins.map((b: SpeciesProfilePhenologyBin) => b.spue), 1e-9);
        const rScale = d3.scaleLinear().domain([0, maxSpue]).range([0, radius]);
        const tau = 2 * Math.PI;

        for (const frac of [0.5, 1]) {
            g.append('circle').attr('r', radius * frac).attr('fill', 'none').attr('stroke', '#e0e0e0').attr('stroke-width', 1);
        }

        const arc = d3.arc()
            .innerRadius(0)
            .outerRadius((d: SpeciesProfilePhenologyBin) => rScale(d.spue))
            .startAngle((d: SpeciesProfilePhenologyBin) => ((d.month - 1) / 12) * tau)
            .endAngle((d: SpeciesProfilePhenologyBin) => (d.month / 12) * tau);

        g.selectAll('path.wedge')
            .data(bins)
            .enter()
            .append('path')
            .attr('d', (d: SpeciesProfilePhenologyBin) => arc(d))
            .attr('fill', '#2471A3')
            .attr('opacity', 0.72)
            .attr('stroke', '#ffffff')
            .attr('stroke-width', 0.75)
            .append('title')
            .text((d: SpeciesProfilePhenologyBin) => `${months[d.month - 1]}: SPUE ${d.spue} (${d.sightings} sightings)`);

        g.selectAll('text.ml')
            .data(months)
            .enter()
            .append('text')
            .attr('x', (_d: string, i: number) => Math.sin(((i + 0.5) / 12) * tau) * (radius + 12))
            .attr('y', (_d: string, i: number) => -Math.cos(((i + 0.5) / 12) * tau) * (radius + 12))
            .attr('text-anchor', 'middle')
            .attr('dominant-baseline', 'middle')
            .style('font-size', '9px')
            .style('fill', '#666')
            .text((d: string) => d);
    }

    /**
     * Yearly SPUE trend: observed points + OLS fit line + 95 % CI band, with a
     * faint secondary NAO line (B4 coupling) when available.
     */
    private static _renderYearlyTrend(host: HTMLElement, phenology: SpeciesProfilePhenology | undefined): void {
        d3.select(host).selectAll('*').remove();
        const trend = phenology ? phenology.trend : [];
        if (trend.length === 0) {
            jQuery(host).text(Lang.i().l('No effort data for a trend'));
            return;
        }

        const width = Math.max(260, (host.clientWidth || 360) - 16);
        const height = 220;
        const margin = {top: 24, right: 12, bottom: 32, left: 40};
        const innerW = width - margin.left - margin.right;
        const innerH = height - margin.top - margin.bottom;
        const svg = d3.select(host).append('svg').attr('width', width).attr('height', height);
        const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

        const years = trend.map((t: SpeciesProfileTrendPoint) => t.year);
        const xMin = Math.min(...years);
        const xMax = Math.max(...years);
        const x = d3.scaleLinear().domain(xMin === xMax ? [xMin - 1, xMax + 1] : [xMin, xMax]).range([0, innerW]);
        const yMax = Math.max(...trend.map((t: SpeciesProfileTrendPoint) => Math.max(t.ci_hi, t.spue)), 1e-6);
        const y = d3.scaleLinear().domain([0, yMax]).nice().range([innerH, 0]);

        g.append('g').attr('transform', `translate(0,${innerH})`).call(d3.axisBottom(x).ticks(Math.min(years.length, 8)).tickFormat((d: number) => `${Math.round(d)}`));
        g.append('g').call(d3.axisLeft(y).ticks(4));

        if (trend.length >= 2) {
            const band = d3.area()
                .x((d: SpeciesProfileTrendPoint) => x(d.year))
                .y0((d: SpeciesProfileTrendPoint) => y(d.ci_lo))
                .y1((d: SpeciesProfileTrendPoint) => y(d.ci_hi));
            g.append('path').datum(trend).attr('fill', 'rgba(36,113,163,0.15)').attr('d', band);

            const fitLine = d3.line()
                .x((d: SpeciesProfileTrendPoint) => x(d.year))
                .y((d: SpeciesProfileTrendPoint) => y(d.fit));
            g.append('path').datum(trend).attr('fill', 'none').attr('stroke', '#2471A3').attr('stroke-width', 1.5).attr('d', fitLine);
        }

        g.selectAll('circle.obs')
            .data(trend)
            .enter()
            .append('circle')
            .attr('cx', (d: SpeciesProfileTrendPoint) => x(d.year))
            .attr('cy', (d: SpeciesProfileTrendPoint) => y(d.spue))
            .attr('r', 3)
            .attr('fill', '#16a085')
            .append('title')
            .text((d: SpeciesProfileTrendPoint) => `${d.year}: SPUE ${d.spue} (${d.sightings} / ${d.tour_hours} h)`);

        // Secondary NAO line (B4 coupling), own scale.
        const naoPts = trend.filter((t: SpeciesProfileTrendPoint) => typeof t.nao === 'number');
        if (naoPts.length >= 2) {
            const naoVals = naoPts.map((t: SpeciesProfileTrendPoint) => t.nao as number);
            const nMin = Math.min(...naoVals);
            const nMax = Math.max(...naoVals);
            const naoScale = d3.scaleLinear().domain(nMin === nMax ? [nMin - 1, nMax + 1] : [nMin, nMax]).range([innerH, 0]);
            const naoLine = d3.line()
                .x((d: SpeciesProfileTrendPoint) => x(d.year))
                .y((d: SpeciesProfileTrendPoint) => naoScale(d.nao as number));
            g.append('path').datum(naoPts).attr('fill', 'none').attr('stroke', '#999999').attr('stroke-width', 1).attr('stroke-dasharray', '3,2').attr('d', naoLine);
        }

        const subtitle = phenology && phenology.n >= 2
            ? `${Lang.i().l('slope')} ${phenology.slope.toFixed(4)}/yr · R² ${phenology.r2.toFixed(2)} · n=${phenology.n}${naoPts.length >= 2 ? ' · NAO ---' : ''}`
            : Lang.i().l('too few years for a fit');
        svg.append('text').attr('x', margin.left).attr('y', 14).style('font-size', '10px').style('fill', '#666').text(subtitle);
    }

    /**
     * Behaviour co-occurrence chord: nodes = top behaviours, ribbon width =
     * sightings where the two were recorded together. Rebuilds the symmetric
     * matrix from the labels + undirected links.
     */
    private static _renderBehaviourChord(host: HTMLElement, cooc: SpeciesProfileBehaviourCooccurrence | undefined): void {
        d3.select(host).selectAll('*').remove();
        const labels = cooc ? cooc.labels : [];
        const links = cooc ? cooc.links : [];
        if (labels.length < 2 || links.length === 0) {
            jQuery(host).text(Lang.i().l('No co-occurring behaviours'));
            return;
        }

        const n = labels.length;
        const matrix: number[][] = Array.from({length: n}, () => new Array(n).fill(0));
        for (const l of links) {
            if (l.source >= 0 && l.source < n && l.target >= 0 && l.target < n && l.source !== l.target) {
                matrix[l.source][l.target] += l.value;
                matrix[l.target][l.source] += l.value;
            }
        }

        const palette = ['#2471A3', '#28a745', '#e67e22', '#8e44ad', '#16a085', '#c0392b', '#f1c40f', '#7f8c8d'];
        const colorFor = (i: number): string => palette[i % palette.length];

        const size = Math.max(320, Math.min(460, host.clientWidth || 420));
        const outer = (size / 2) - 90;
        const inner = outer - 12;
        const svg = d3.select(host).append('svg').attr('width', size).attr('height', size);
        const g = svg.append('g').attr('transform', `translate(${size / 2},${size / 2})`);

        const chords = d3.chord().padAngle(0.05).sortSubgroups(d3.descending)(matrix);
        const arc = d3.arc().innerRadius(inner).outerRadius(outer);
        const ribbon = d3.ribbon().radius(inner);

        const group = g.append('g').selectAll('g').data(chords.groups).enter().append('g');
        group.append('path')
            .attr('d', arc)
            .attr('fill', (d: {index: number;}) => colorFor(d.index))
            .attr('stroke', '#ffffff');
        group.append('text')
            .each((d: {angle: number; startAngle: number; endAngle: number;}) => {
                d.angle = (d.startAngle + d.endAngle) / 2;
            })
            .attr('dy', '0.35em')
            .attr('transform', (d: {angle: number;}) =>
                `rotate(${((d.angle * 180) / Math.PI) - 90}) translate(${outer + 6})${d.angle > Math.PI ? ' rotate(180)' : ''}`)
            .attr('text-anchor', (d: {angle: number;}) => (d.angle > Math.PI ? 'end' : 'start'))
            .style('font-size', '10px')
            .style('fill', '#444')
            .text((d: {index: number;}) => labels[d.index]);

        g.append('g')
            .attr('fill-opacity', 0.62)
            .selectAll('path')
            .data(chords)
            .enter()
            .append('path')
            .attr('d', ribbon)
            .attr('fill', (d: {target: {index: number;};}) => colorFor(d.target.index))
            .attr('stroke', '#ffffff')
            .append('title')
            .text((d: {source: {index: number;}; target: {index: number;};}) =>
                `${labels[d.source.index]} ↔ ${labels[d.target.index]}: ${matrix[d.source.index][d.target.index]}`);
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