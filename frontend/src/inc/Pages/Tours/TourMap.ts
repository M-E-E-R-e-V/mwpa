/* global JQuery */
import {
    Card2,
    ContentCol2,
    ContentColSize2,
    ContentRow2,
    SidebarMenuItem2,
    SidebarMenuItemBadge2,
    SidebarMenuTree2
} from 'bambooo';
import moment from 'moment';
import {boundingExtent} from 'ol/extent';
import {fromLonLat} from 'ol/proj';
import {Organization as OrganizationAPI} from '../../Api/Organization';
import {ProtectedArea as ProtectedAreaAPI} from '../../Api/ProtectedArea';
import {Species as SpeciesAPI, SpeciesEntry} from '../../Api/Species';
import {
    Tours as ToursAPI,
    ToursTrackingData,
    ToursTrackingNeighborTour,
    ToursTrackingSightingData
} from '../../Api/Tours';
import {User as UserAPI} from '../../Api/User';
import {Vehicle as VehicleAPI} from '../../Api/Vehicle';
import {VehicleDriver as VehicleDriverAPI} from '../../Api/VehicleDriver';
import {Lang} from '../../Lang';
import {BaseMap} from '../../Map/BaseMap';
import {BathymetryLayer} from '../../Map/Layers/BathymetryLayer';
import {IdeeEsLayer} from '../../Map/Layers/IdeeEsLayer';
import {OsmBaseLayer} from '../../Map/Layers/OsmBaseLayer';
import {ProtectedAreaLayer} from '../../Map/Layers/ProtectedAreaLayer';
import {SightingPointsLayer} from '../../Map/Layers/SightingPointsLayer';
import {TourSightingRouteLayer} from '../../Map/Layers/TourSightingRouteLayer';
import {TourTrackLayer} from '../../Map/Layers/TourTrackLayer';
import {SightingMapObjectType} from '../../Map/Styles/SightingStyles';
import {Nav} from '../../Nav';
import {GeolocationCoordinates} from '../../Types/GeolocationCoordinates';
import {UtilDistanceCoast} from '../../Utils/UtilDistanceCoast';
import {UtilLocation} from '../../Utils/UtilLocation';
import {UtilSpeciesSilhouette} from '../../Utils/UtilSpeciesSilhouette';
import {AdminListUi} from '../../Widget/AdminListUi';
import {MapLayerPanel} from '../../Widget/MapLayerPanel';
import {BasePage} from '../BasePage';
import {TOURS_PAGE_NAME} from '../PageNames';
import {Tours} from '../Tours';
import {TrackingChart} from './TrackingChart';
import {TransferModal} from './TransferModal';

/**
 * A sighting of the tour with the track points recorded during it.
 */
type TourMapSighting = {
    data: ToursTrackingSightingData;
    start: number;
    end: number;
    points: number[][];
    position: number[] | null;
};

/**
 * Figures of the recorded track.
 */
type TourTrackStats = {
    distanceM: number;
    maxSpeedKn: number | null;
    avgSpeedKn: number | null;
    first: GeolocationCoordinates | null;
    last: GeolocationCoordinates | null;
};

/**
 * ToursMap
 *
 * One tour: header with boat, crew and navigation to the previous / next
 * tour of the boat, key figures of the track, the map (fitted to the track)
 * with a side panel listing the sightings, and the tracking chart below
 * (admins: delete / transfer a brushed range).
 */
export class ToursMap extends BasePage {

    /**
     * Boat marker every n track points (direction hint on the line).
     */
    protected static readonly _BOAT_EVERY = 400;

    /**
     * Earth radius for the track length (m).
     */
    protected static readonly _EARTH_RADIUS_M = 6371008.8;

    protected static readonly _MS_TO_KN = 1.943844;

    protected override _name: string = 'tour_map';

    protected _tourId: number;

    protected _map: BaseMap | null = null;

    protected _track: TourTrackLayer | null = null;

    protected _sightingRoutes: TourSightingRouteLayer | null = null;

    protected _points: SightingPointsLayer | null = null;

    /**
     * Separate layer for the brushed-range highlight, so the boat/sighting
     * features keep their normal styles while the overlay toggles.
     */
    protected _highlight: SightingPointsLayer | null = null;

    protected _badge: SidebarMenuItemBadge2 | null = null;

    protected _chart: TrackingChart | null = null;

    protected _transferModal: TransferModal | null = null;

    protected _parsedPositions: GeolocationCoordinates[] = [];

    protected _brushRange: {timestampFrom: number; timestampTo: number;} | null = null;

    protected _actionBar: {
        info: JQuery;
        buttons: JQuery;
        confirm: JQuery;
        btnDelete: JQuery<HTMLButtonElement>;
        btnTransfer: JQuery<HTMLButtonElement>;
    } | null = null;

    protected _reload: (() => Promise<void>) | null = null;

    protected _header: JQuery | null = null;

    protected _stats: JQuery | null = null;

    protected _panel: JQuery | null = null;

    protected _layerPanel: MapLayerPanel | null = null;

    protected _protectedAreas: ProtectedAreaLayer | null = null;

    protected _species = new Map<number, SpeciesEntry>();

    protected _vehicleNames = new Map<number, string>();

    protected _driverNames = new Map<number, string>();

    public constructor(tourId: number) {
        super();
        this._tourId = tourId;
    }

    /**
     * Track length (haversine, m), speeds (knots) and first / last point.
     * @param {GeolocationCoordinates[]} positions sorted by time
     * @return {TourTrackStats}
     */
    public static trackStats(positions: GeolocationCoordinates[]): TourTrackStats {
        let distanceM = 0;
        let maxSpeed: number | null = null;
        let speedSum = 0;
        let speedCount = 0;

        for (let i = 0; i < positions.length; i++) {
            const pos = positions[i];

            if (i > 0) {
                distanceM += ToursMap.distanceM(positions[i - 1], pos);
            }

            if (pos.speed !== undefined && pos.speed !== null && Number.isFinite(pos.speed) && pos.speed > 0) {
                maxSpeed = Math.max(maxSpeed ?? 0, pos.speed);
                speedSum += pos.speed;
                speedCount++;
            }
        }

        return {
            distanceM,
            maxSpeedKn: maxSpeed === null ? null : maxSpeed * ToursMap._MS_TO_KN,
            avgSpeedKn: speedCount > 0 ? (speedSum / speedCount) * ToursMap._MS_TO_KN : null,
            first: positions[0] ?? null,
            last: positions[positions.length - 1] ?? null
        };
    }

    /**
     * Great-circle distance between two positions (m).
     * @param {GeolocationCoordinates} a
     * @param {GeolocationCoordinates} b
     * @return {number}
     */
    public static distanceM(a: GeolocationCoordinates, b: GeolocationCoordinates): number {
        const rad = Math.PI / 180;
        const dLat = ((b.latitude ?? 0) - (a.latitude ?? 0)) * rad;
        const dLon = ((b.longitude ?? 0) - (a.longitude ?? 0)) * rad;
        const h = (Math.sin(dLat / 2) ** 2) +
            (Math.cos((a.latitude ?? 0) * rad) * Math.cos((b.latitude ?? 0) * rad) * (Math.sin(dLon / 2) ** 2));

        return 2 * ToursMap._EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)));
    }

    /**
     * Timestamp (ms) of a JSON GeolocationCoordinates string, 0 if none.
     * @param {string} raw
     * @return {number}
     */
    protected static _timestampOf(raw: string): number {
        try {
            return (JSON.parse(raw) as GeolocationCoordinates | null)?.timestamp ?? 0;
        } catch {
            return 0;
        }
    }

    /**
     * [lon, lat] of a JSON GeolocationCoordinates string.
     * @param {string} raw
     * @return {number[]|null}
     */
    protected static _lonLatOf(raw: string): number[] | null {
        try {
            const pos = JSON.parse(raw) as GeolocationCoordinates | null;

            if (pos && Number.isFinite(pos.longitude) && Number.isFinite(pos.latitude)) {
                return [pos.longitude!, pos.latitude!];
            }
        } catch {
            // legacy text
        }

        return null;
    }

    protected static _duration(minutes: number): string {
        return `${Math.floor(minutes / 60)} h ${`${Math.round(minutes % 60)}`.padStart(2, '0')} min`;
    }

    public override async unloadContent(): Promise<void> {
        if (this._map) {
            this._map.disposePopover(true);
            this._map.unload();
            this._map = null;
        }

        this._track = null;
        this._sightingRoutes = null;
        this._points = null;
        this._highlight = null;
        this._chart = null;
        this._transferModal = null;
        this._parsedPositions = [];
        this._brushRange = null;
        this._actionBar = null;
        this._reload = null;
        this._header = null;
        this._stats = null;
        this._panel = null;
        this._layerPanel = null;
        this._protectedAreas = null;
    }

    public override async loadContent(): Promise<void> {
        const lang = Lang.i();
        const menuItem = this._wrapper.getMainSidebar()?.getSidebar().getMenu()?.getMenuItem(TOURS_PAGE_NAME) ?? null;

        if (menuItem !== null) {
            const menuTree = new SidebarMenuTree2(menuItem);
            const pmenuItem = new SidebarMenuItem2(menuTree, true);
            pmenuItem.setTitle(`${lang.l('Tour')} #${this._tourId}`);
            pmenuItem.setActiv(true);

            this._badge = new SidebarMenuItemBadge2(pmenuItem);
            this._badge.setContent('0');
        }

        const content = this._wrapper.getContentWrapper().getContent().getContentFluidElement();

        // one card: header + figures, map + sightings panel, chart --------------------------------
        const row = new ContentRow2(content);
        const card = new Card2({});
        card.appendTo(new ContentCol2(row, ContentColSize2.col12).getElement());
        card.getHeaderElement().remove();
        // bambooo cards default to a flush, scrolling body (for tables)
        const body = card.getBodyElement().removeClass('p-0 table-responsive').addClass('p-3');

        this._header = jQuery('<div class="mwpa-tourmap-head"/>').appendTo(body);
        this._stats = jQuery('<div class="mwpa-tourmap-stats"/>').appendTo(body);

        const layout = jQuery('<div class="mwpa-sighting-map mwpa-tourmap-map"/>').appendTo(body);
        const mapMain = jQuery('<div class="mwpa-sighting-map-main"/>').appendTo(layout);
        this._panel = jQuery('<div class="mwpa-sighting-map-panel mwpa-tourmap-panel"/>').appendTo(layout);

        const fitBtn = jQuery('<button type="button" class="btn btn-sm btn-light border shadow-sm mwpa-map-overlay mwpa-map-overlay-tools"/>')
        .attr('title', lang.l('Show whole tour'))
        .appendTo(mapMain);
        jQuery('<i class="fas fa-expand"/>').appendTo(fitBtn);
        fitBtn.on('click', (): void => {
            this._fitView();
        });

        this._map = new BaseMap(mapMain);

        const mapTop = mapMain[0]?.getBoundingClientRect().top ?? 0;
        const mapHeight = Math.max(380, Math.min(760, mapTop > 0 ? window.innerHeight - mapTop - 32 : window.innerHeight - 420));
        this._map.setHeight(mapHeight);
        this._panel.css('max-height', `${mapHeight}px`);

        this._map.load({initialCenterLonLat: [11.030, 47.739], initialZoom: 2.2, withLayerSwitcher: false});
        this._map.addLayer(new OsmBaseLayer());
        this._map.addLayer(new BathymetryLayer());

        // relief only covers Spain — offered, but OpenStreetMap is the default background
        const relief = new IdeeEsLayer();
        this._map.addLayer(relief);
        relief.getOlLayer().setVisible(false);

        this._track = new TourTrackLayer();
        this._sightingRoutes = new TourSightingRouteLayer();
        this._points = new SightingPointsLayer();
        this._highlight = new SightingPointsLayer();

        // BaseMap.addLayer is keyed by getName(): give the highlight its own name.
        this._highlight.getName = (): string => 'tracking_highlight_layer';
        this._highlight.getTitle = (): string => 'Tracking selection';

        this._map.addLayer(this._track);
        this._map.addLayer(this._sightingRoutes);
        this._map.addLayer(this._highlight);
        this._map.addLayer(this._points);

        // own layer panel (as on the sighting map); the brush highlight is not a user layer
        this._layerPanel = new MapLayerPanel(mapMain, this._map, [this._highlight.getName()]);
        this._loadProtectedAreas().catch(() => undefined);

        // highlight above track (60) and routes (70), below the clickable markers (99)
        this._highlight.getOlLayer()?.setZIndex(80);

        // chart ---------------------------------------------------------------------------------
        const chartSection = jQuery('<div class="mwpa-tourmap-chart"/>').appendTo(body);
        const chartHead = jQuery('<div class="mwpa-tourmap-chart-head"/>').appendTo(chartSection);
        jQuery('<span class="mwpa-tourmap-panel-title p-0"/>').text(lang.l('Tracking points · time / count / speed')).appendTo(chartHead);
        const chartTools = jQuery('<div/>').appendTo(chartHead);
        const bucketSelect = jQuery<HTMLSelectElement>('<select class="form-select form-select-sm d-inline-block w-auto"/>')
        .attr('title', lang.l('Interval'))
        .appendTo(chartTools);

        for (const minutes of [1, 5, 10, 15, 30, 60]) {
            jQuery('<option/>').attr('value', `${minutes}`).text(`${minutes} min`).appendTo(bucketSelect);
        }

        bucketSelect.val('10');

        const chartHost = jQuery('<div class="tour-tracking-chart"/>').appendTo(chartSection);
        this._chart = new TrackingChart(chartHost[0] as HTMLElement);

        bucketSelect.on('change', (): void => {
            const minutes = parseInt(`${bucketSelect.val()}`, 10);

            if (Number.isFinite(minutes) && minutes > 0) {
                this._chart?.setBucketMinutes(minutes);
            }
        });

        // lookups + user ------------------------------------------------------------------------
        const [currentuser, vehicles, drivers, species] = await Promise.all([
            UserAPI.getUserInfo(),
            VehicleAPI.getList(true),
            VehicleDriverAPI.getList(true),
            SpeciesAPI.getList(true)
        ]);

        for (const v of vehicles ?? []) {
            this._vehicleNames.set(v.id, v.name);
        }

        for (const d of drivers ?? []) {
            this._driverNames.set(d.id, d.user.name);
        }

        for (const s of species ?? []) {
            this._species.set(s.id, s);
        }

        if (currentuser?.user?.isAdmin === true) {
            this._buildActionBar(chartSection);
            this._transferModal = new TransferModal(this._wrapper.getContentWrapper().getContent());
        }

        const orgCenter = currentuser?.organization ?
            fromLonLat([parseFloat(currentuser.organization.lon), parseFloat(currentuser.organization.lat)]) :
            null;

        this._chart.onBrush((range) => {
            this._brushRange = range;
            this._renderHighlight();
            this._refreshActionBar();
        });

        this._reload = async(): Promise<void> => {
            await this._loadTrackingData(orgCenter);
        };

        await this._reload();
    }

    /**
     * Header: back link, title, boat & crew, previous / next tour.
     * @param {ToursTrackingData|null} data
     */
    protected async _renderHeader(data: ToursTrackingData | null): Promise<void> {
        if (!this._header) {
            return;
        }

        const lang = Lang.i();
        const head = this._header.empty();
        const left = jQuery('<div class="d-flex align-items-center gap-3 min-w-0"/>').appendTo(head);

        const back = jQuery('<button type="button" class="btn btn-sm btn-outline-secondary"/>')
        .attr('title', lang.l('Tour list'))
        .appendTo(left);
        jQuery('<i class="fas fa-arrow-left"/>').appendTo(back);
        back.on('click', (): void => {
            Nav.load(new Tours()).then();
        });

        const titleBox = jQuery('<div class="min-w-0"/>').appendTo(left);
        const date = moment((data?.date ?? '').split(' ')[0]);
        const title = jQuery('<h5 class="mb-0 d-flex align-items-center gap-2"/>').appendTo(titleBox);
        jQuery('<span/>').text(`${lang.l('Tour')} ${date.isValid() ? date.format('YYYY.MM.DD') : ''}`).appendTo(title);
        jQuery('<span class="font-monospace small text-body-secondary fw-normal"/>').text(`#${this._tourId}`).appendTo(title);

        const sub = jQuery('<div class="small text-body-secondary d-flex flex-wrap gap-3 mt-1"/>').appendTo(titleBox);
        const item = (icon: string, text: string, hint: string): void => {
            const span = jQuery('<span class="text-nowrap"/>').attr('title', lang.l(hint)).appendTo(sub);
            jQuery('<i class="fa-fw me-1 opacity-75"/>').addClass(icon).appendTo(span);
            jQuery('<span/>').text(text).appendTo(span);
        };

        if (data?.vehicle_id) {
            item('fas fa-ship', this._vehicleNames.get(data.vehicle_id) ?? `#${data.vehicle_id}`, 'Boat');
        }

        if (data?.vehicle_driver_id) {
            item('fas fa-user-tie', this._driverNames.get(data.vehicle_driver_id) ?? `#${data.vehicle_driver_id}`, 'Skipper');
        }

        if ((data?.beaufort_wind ?? '').trim() !== '') {
            item('fas fa-wind', `${data?.beaufort_wind} Bft`, 'Wind/Seastate (Beaufort)');
        }

        if ((data?.tour_fid ?? '') !== '') {
            item('fas fa-fingerprint', data?.tour_fid ?? '', 'Tour key');
        }

        // previous / next tour of the boat
        const nav = jQuery('<div class="btn-group btn-group-sm flex-shrink-0"/>').appendTo(head);
        const neighbors = await ToursAPI.getTrackingNeighbors(this._tourId).catch(() => null);
        const navButton = (tour: ToursTrackingNeighborTour | undefined, icon: string, label: string, after: boolean): void => {
            const btn = jQuery('<button type="button" class="btn btn-outline-secondary"/>').appendTo(nav);
            const text = tour ? `${label} · ${moment(tour.date.split(' ')[0]).format('DD.MM.')} ${tour.tour_start}` : label;
            const iconEl = jQuery('<i/>').addClass(icon);
            const textEl = jQuery('<span/>').text(text);

            btn.append(after ? [textEl, iconEl.addClass('ms-2')] : [iconEl.addClass('me-2'), textEl]);

            if (tour) {
                btn.attr('title', `#${tour.id}`).on('click', (): void => {
                    Nav.load(new ToursMap(tour.id)).then();
                });
            } else {
                btn.prop('disabled', true);
            }
        };

        navButton(neighbors?.prev, 'fas fa-chevron-left', lang.l('Previous tour'), false);
        navButton(neighbors?.next, 'fas fa-chevron-right', lang.l('Next tour'), true);
    }

    /**
     * Key figures of the tour.
     * @param {ToursTrackingData|null} data
     * @param {TourTrackStats} stats
     * @param {number} sightings
     */
    protected _renderStats(data: ToursTrackingData | null, stats: TourTrackStats, sightings: number): void {
        if (!this._stats) {
            return;
        }

        const lang = Lang.i();
        const box = this._stats.empty();
        const start = (data?.start ?? '').trim();
        const end = (data?.end ?? '').trim();
        let timeSub = '';

        if (stats.first?.timestamp && stats.last?.timestamp && stats.last.timestamp > stats.first.timestamp) {
            timeSub = `${lang.l('Track')}: ${ToursMap._duration((stats.last.timestamp - stats.first.timestamp) / 60000)}`;
        }

        const tile = (icon: string, value: string, label: string, sub: string = ''): void => {
            const el = AdminListUi.stat(box, icon, value, label);

            if (sub !== '') {
                jQuery('<div class="small text-body-tertiary"/>').text(sub).appendTo(el.find('.lh-sm'));
            }
        };

        tile('far fa-clock', start === '' && end === '' ? '–' : `${start || '…'} – ${end || '…'}`, 'Time', timeSub);

        if (this._parsedPositions.length > 1) {
            const nm = stats.distanceM / 1852;
            tile('fas fa-route', `${nm.toFixed(1)} nm`, 'Distance', `${(stats.distanceM / 1000).toFixed(1)} km`);
        }

        if (stats.avgSpeedKn !== null) {
            tile('fas fa-tachometer-alt', `${stats.avgSpeedKn.toFixed(1)} kn`, 'Average speed', `max ${(stats.maxSpeedKn ?? 0).toFixed(1)} kn`);
        }

        tile('fas fa-binoculars', `${sightings}`, 'Sightings');
        tile('fas fa-map-pin', this._parsedPositions.length.toLocaleString(), 'Tracking points');
    }

    /**
     * Side panel: the sightings of the tour in time order.
     * @param {TourMapSighting[]} sightings
     */
    protected _renderPanel(sightings: TourMapSighting[]): void {
        if (!this._panel) {
            return;
        }

        const lang = Lang.i();
        const panel = this._panel.empty();
        jQuery('<div class="mwpa-tourmap-panel-title"/>').text(`${lang.l('Sightings')} (${sightings.length})`).appendTo(panel);

        if (sightings.length === 0) {
            jQuery('<div class="text-body-secondary small py-3"/>').text(lang.l('No sightings on this tour.')).appendTo(panel);
            return;
        }

        const list = jQuery('<div class="list-group list-group-flush"/>').appendTo(panel);

        for (const sighting of [...sightings].sort((a, b) => a.start - b.start)) {
            const entry = this._species.get(sighting.data.species_id);
            const name = (entry?.name ?? sighting.data.species_name).split(',')[0];
            const itemEl = jQuery('<button type="button" class="list-group-item list-group-item-action mwpa-tourmap-sighting"/>').appendTo(list);
            const pic = jQuery('<span class="mwpa-tourmap-sighting-pic"/>').appendTo(itemEl);
            pic[0].insertAdjacentHTML('beforeend', UtilSpeciesSilhouette.img(entry?.name ?? sighting.data.species_name, 32, SpeciesAPI.imageUrl(entry)));

            const text = jQuery('<span class="min-w-0 flex-grow-1"/>').appendTo(itemEl);
            jQuery('<span class="d-block fw-semibold text-truncate"/>').text(name || lang.l('Unknown')).appendTo(text);

            const parts: string[] = [];

            if (sighting.start > 0) {
                parts.push(`${moment(sighting.start).format('HH:mm')}${sighting.end > sighting.start ? `–${moment(sighting.end).format('HH:mm')}` : ''}`);
            }

            parts.push(`${sighting.data.species_count} ${lang.l('animals')}`);

            const distance = parseFloat(sighting.data.distance_coast) || 0;

            if (distance >= 10) {
                parts.push(`${UtilDistanceCoast.meterToM(distance, true)} nm`);
            }

            jQuery('<span class="d-block small text-body-secondary"/>').text(parts.join(' · ')).appendTo(text);

            if (sighting.data.files.length > 0) {
                jQuery('<i class="fas fa-camera text-body-tertiary"/>').attr('title', lang.l('Photos')).appendTo(itemEl);
            }

            if (sighting.position) {
                itemEl.on('click', (): void => {
                    this._zoomTo(sighting.position!);
                });
            } else {
                itemEl.prop('disabled', true).attr('title', lang.l('No position'));
            }
        }
    }

    /**
     * Natura 2000 areas of the organisation's region in the layer panel
     * (same source as the sighting map; one attempt — the sighting page
     * triggers the background load).
     */
    protected async _loadProtectedAreas(): Promise<void> {
        const lang = Lang.i();
        const data = await ProtectedAreaAPI.get().catch(() => null);

        if (!this._map || !this._layerPanel || data === null) {
            return;
        }

        switch (data.status) {
            case 'ok':
                this._protectedAreas = new ProtectedAreaLayer();
                this._map.addLayer(this._protectedAreas);
                this._protectedAreas.setGeoJson(data.geojson ?? '{"type":"FeatureCollection","features":[]}');
                this._layerPanel.setAreaStatus(`${data.feature_count} ${lang.l('areas')} · ${data.source} · ${lang.l('as of')} ${moment(data.fetch_datetime * 1000).format('YYYY.MM.DD')}`);
                this._layerPanel.setAreaLayer(this._protectedAreas);
                this._updateAreaCounts();
                break;

            case 'pending':
                this._layerPanel.setAreaStatus(lang.l('Loading the protected areas of your region …'));
                break;

            case 'no_area':
                this._layerPanel.setAreaStatus(lang.l('Your organization has no home area or position — no protected areas.'));
                break;

            default:
                this._layerPanel.setAreaStatus(lang.l('The protected areas could not be loaded (EEA service). Next attempt in a few hours.'));
        }
    }

    /**
     * Sightings of the tour per protected area (panel badges + default
     * visibility: areas with sightings are shown).
     */
    protected _updateAreaCounts(): void {
        if (this._protectedAreas && this._layerPanel && this._points) {
            this._layerPanel.setAreaCounts(this._protectedAreas.countInside(this._points.getPointCoordinates()));
        }
    }

    protected _zoomTo(lonLat: number[]): void {
        const view = this._map?.getOlMap()?.getView();

        view?.animate({center: fromLonLat(lonLat), zoom: Math.max(view.getZoom() ?? 0, 14), duration: 400});
    }

    /**
     * Fit the view to the track and the sightings.
     * @return {boolean} false when there is nothing to fit
     */
    protected _fitView(): boolean {
        const view = this._map?.getOlMap()?.getView();
        const coords: number[][] = this._parsedPositions
        .filter((p) => Number.isFinite(p.longitude) && Number.isFinite(p.latitude))
        .map((p) => fromLonLat([p.longitude!, p.latitude!]));
        const extent = this._points?.getDataExtent();

        if (extent) {
            coords.push([extent[0], extent[1]], [extent[2], extent[3]]);
        }

        if (!view || coords.length === 0) {
            return false;
        }

        view.fit(boundingExtent(coords), {padding: [60, 60, 60, 60], maxZoom: 14, duration: 300});
        return true;
    }

    /**
     * Inline Delete / Transfer bar with an inline delete confirmation.
     * Admins only.
     * @param {JQuery} host
     */
    protected _buildActionBar(host: JQuery): void {
        const lang = Lang.i();
        const bar = jQuery('<div class="d-flex flex-wrap align-items-center gap-2 pt-2 border-top mt-2"/>').appendTo(host);
        const info = jQuery('<div class="text-body-secondary small flex-grow-1"/>').appendTo(bar);
        const buttons = jQuery('<div class="d-flex gap-2"/>').appendTo(bar);

        const btnDelete = jQuery<HTMLButtonElement>('<button type="button" class="btn btn-sm btn-outline-danger" disabled/>').appendTo(buttons);
        jQuery('<i class="fas fa-trash me-1"/>').appendTo(btnDelete);
        jQuery('<span/>').text(lang.l('Delete range')).appendTo(btnDelete);

        const btnTransfer = jQuery<HTMLButtonElement>('<button type="button" class="btn btn-sm btn-outline-primary" disabled/>').appendTo(buttons);
        jQuery('<i class="fas fa-exchange-alt me-1"/>').appendTo(btnTransfer);
        jQuery('<span/>').text(lang.l('Transfer range …')).appendTo(btnTransfer);

        const confirm = jQuery('<div class="d-none align-items-center gap-2"/>').appendTo(bar);
        jQuery('<span class="small text-danger fw-semibold"/>').appendTo(confirm);
        const btnYes = jQuery('<button type="button" class="btn btn-sm btn-danger"/>').text(lang.l('Delete')).appendTo(confirm);
        const btnNo = jQuery('<button type="button" class="btn btn-sm btn-outline-secondary"/>').text(lang.l('Cancel')).appendTo(confirm);

        const showConfirm = (show: boolean): void => {
            buttons.toggleClass('d-none', show).toggleClass('d-flex', !show);
            confirm.toggleClass('d-none', !show).toggleClass('d-flex', show);
        };

        btnDelete.on('click', (): void => {
            confirm.find('span').text(lang.l('Delete %d tracking points? This cannot be undone.').replace('%d', `${this._selectedCount()}`));
            showConfirm(true);
        });

        btnNo.on('click', (): void => showConfirm(false));
        btnYes.on('click', (): void => {
            showConfirm(false);
            this._handleDelete().catch(() => undefined);
        });

        btnTransfer.on('click', (): void => {
            this._handleTransfer().catch(() => undefined);
        });

        this._actionBar = {info, buttons, confirm, btnDelete, btnTransfer};
        this._refreshActionBar();
    }

    protected _renderHighlight(): void {
        if (!this._highlight) {
            return;
        }

        this._highlight.clearFeatures();

        if (this._brushRange) {
            const {timestampFrom, timestampTo} = this._brushRange;

            for (const pos of this._parsedPositions) {
                if (pos.timestamp !== undefined && pos.longitude !== undefined && pos.latitude !== undefined &&
                    pos.timestamp >= timestampFrom && pos.timestamp <= timestampTo) {
                    this._highlight.addSighting(
                        SightingMapObjectType.TrackingHighlight,
                        `hl-${pos.timestamp}`,
                        `Tracking @ ${moment(pos.timestamp).format('HH:mm:ss')}`,
                        [pos.longitude, pos.latitude]
                    );
                }
            }
        }

        this._highlight.refresh();
    }

    protected _selectedCount(): number {
        if (!this._brushRange) {
            return 0;
        }

        const {timestampFrom, timestampTo} = this._brushRange;

        return this._parsedPositions.filter((pos) => pos.timestamp !== undefined && pos.timestamp >= timestampFrom && pos.timestamp <= timestampTo).length;
    }

    protected _refreshActionBar(): void {
        if (!this._actionBar) {
            return;
        }

        const lang = Lang.i();
        const count = this._selectedCount();
        const active = count > 0 && this._brushRange !== null;

        this._actionBar.btnDelete.prop('disabled', !active);
        this._actionBar.btnTransfer.prop('disabled', !active);

        if (active && this._brushRange) {
            const from = moment(this._brushRange.timestampFrom).format('HH:mm:ss');
            const to = moment(this._brushRange.timestampTo).format('HH:mm:ss');
            this._actionBar.info.text(`${lang.l('Selection')}: ${from} – ${to} · ${count} ${lang.l('points')}`);
        } else {
            this._actionBar.info.text(lang.l('Brush a range on the chart to enable actions.'));
        }
    }

    protected async _afterRangeAction(): Promise<void> {
        this._brushRange = null;
        this._chart?.clearBrush();
        await this._reload?.();
    }

    protected async _handleDelete(): Promise<void> {
        if (!this._brushRange) {
            return;
        }

        const lang = Lang.i();

        try {
            const deleted = await ToursAPI.deleteTracking(this._tourId, this._brushRange.timestampFrom, this._brushRange.timestampTo);
            await this._afterRangeAction();
            this._toast.fire({icon: 'success', title: lang.l('%d tracking points deleted.').replace('%d', `${deleted}`)});
        } catch (e) {
            this._toast.fire({icon: 'error', title: `${lang.l('Delete failed')}: ${(e as Error).message}`});
        }
    }

    protected async _handleTransfer(): Promise<void> {
        if (!this._brushRange || !this._transferModal) {
            return;
        }

        const lang = Lang.i();
        const range = this._brushRange;
        const neighbors = await ToursAPI.getTrackingNeighbors(this._tourId);

        this._transferModal.resetValues();
        this._transferModal.setRange(range.timestampFrom, range.timestampTo, this._selectedCount());
        this._transferModal.setNeighbors(neighbors?.prev, neighbors?.next);
        this._transferModal.setOnConfirm(async(targetTourId) => {
            try {
                const transferred = await ToursAPI.transferTracking(this._tourId, targetTourId, range.timestampFrom, range.timestampTo);
                this._transferModal?.hide();
                await this._afterRangeAction();
                this._toast.fire({
                    icon: 'success',
                    title: lang.l('%d tracking points moved to tour #%t.').replace('%d', `${transferred}`).replace('%t', `${targetTourId}`)
                });
            } catch (e) {
                this._toast.fire({icon: 'error', title: `${lang.l('Transfer failed')}: ${(e as Error).message}`});
            }
        });
        this._transferModal.show();
    }

    /**
     * Popup of a sighting marker.
     * @param {TourMapSighting} sighting
     * @return {string}
     */
    protected _popupHtml(sighting: TourMapSighting): string {
        const lang = Lang.i();
        const esc = (s: string): string => AdminListUi.escape(s);
        const entry = this._species.get(sighting.data.species_id);
        const rows: [string, string][] = [
            ['Species', esc((entry?.name ?? sighting.data.species_name).split(',')[0])],
            ['Number of animals', `${sighting.data.species_count}`]
        ];

        if (sighting.start > 0) {
            rows.push(['Time', esc(`${moment(sighting.start).format('HH:mm')}${sighting.end > sighting.start ? ` – ${moment(sighting.end).format('HH:mm')}` : ''}`)]);
        }

        const distance = parseFloat(sighting.data.distance_coast) || 0;

        if (distance >= 10) {
            rows.push(['Distance to coast', `${UtilDistanceCoast.meterToM(distance, true)} nm`]);
        }

        for (const extended of sighting.data.extended) {
            if (extended.name === 'depth_contour') {
                rows.push(['Sea depth', `${esc(`${extended.data}`)} m`]);
            }
        }

        if (sighting.position) {
            const lat = UtilLocation.ddToDm(sighting.position[1], true);
            const lon = UtilLocation.ddToDm(sighting.position[0], false);
            rows.push(['Position', esc(`${lat.direction} ${lat.degree}º ${lat.minute.toFixed(3)} · ${lon.direction} ${lon.degree}º ${lon.minute.toFixed(3)}`)]);
        }

        let html = '<table class="table table-sm table-borderless small mb-0">';

        for (const [label, value] of rows) {
            html += `<tr><td class="text-body-secondary pe-2 ps-0 py-0 text-nowrap">${esc(lang.l(label))}</td><td class="py-0">${value}</td></tr>`;
        }

        html += '</table>';

        for (const file of sighting.data.files) {
            const src = `/json/sightings/getimage/${sighting.data.id}/${encodeURIComponent(file)}`;
            html += `<img class="d-block mt-2 rounded" width="220" src="${src}" alt="${esc(file)}">`;
        }

        return html;
    }

    /**
     * Load tracking + sightings and rebuild map, panel, figures and chart.
     * Used for the first paint and after every delete / transfer.
     * @param {number[]|null} orgCenter fallback view center
     */
    protected async _loadTrackingData(orgCenter: number[] | null): Promise<void> {
        const data = await ToursAPI.getTrackingList(this._tourId);

        this._track?.setTrack([]);
        this._track?.refresh();
        this._sightingRoutes?.clearFeatures();
        this._points?.clearFeatures();
        this._highlight?.clearFeatures();
        this._highlight?.refresh();
        this._parsedPositions = [];

        // positions, sorted and de-duplicated by timestamp
        const byTime = new Map<number, GeolocationCoordinates>();

        for (const raw of data?.positions ?? []) {
            try {
                const pos = JSON.parse(raw) as GeolocationCoordinates;

                if (pos.timestamp && Number.isFinite(pos.longitude) && Number.isFinite(pos.latitude) && pos.longitude && pos.latitude) {
                    byTime.set(pos.timestamp, pos);
                }
            } catch {
                // legacy text
            }
        }

        this._parsedPositions = [...byTime.entries()].sort(([a], [b]) => a - b).map(([, pos]) => pos);

        // sightings with the track points recorded during them
        const sightings: TourMapSighting[] = (data?.sightings ?? []).map((s) => ({
            data: s,
            start: ToursMap._timestampOf(s.location_begin),
            end: ToursMap._timestampOf(s.location_end),
            points: [],
            position: ToursMap._lonLatOf(s.location_begin)
        }));

        const coordList: number[][] = [];

        this._parsedPositions.forEach((pos, index) => {
            const lonLat = [pos.longitude!, pos.latitude!];
            coordList.push(lonLat);

            for (const sighting of sightings) {
                if (sighting.start > 0 && pos.timestamp! >= sighting.start && pos.timestamp! <= sighting.end) {
                    sighting.points.push(lonLat);
                }
            }

            if (index > 0 && index % ToursMap._BOAT_EVERY === 0) {
                const prev = this._parsedPositions[index - 1];
                this._points?.addRawObject({
                    type: 'Feature',
                    properties: {pointtype: 'boat', start: [prev.longitude, prev.latitude], end: lonLat},
                    geometry: {type: 'Point', coordinates: lonLat}
                });
            }
        });

        for (const sighting of sightings) {
            if (sighting.points.length > 1) {
                this._sightingRoutes?.addSightingRoute(sighting.data.pointtype, sighting.points);
            }

            const marker = sighting.points[0] ?? sighting.position;

            if (marker) {
                sighting.position = marker;
                this._points?.addSighting(sighting.data.pointtype, sighting.data.id, this._popupHtml(sighting), marker);
            }
        }

        this._track?.setTrack(coordList);
        this._track?.refresh();

        const first = this._parsedPositions[0];
        const last = this._parsedPositions[this._parsedPositions.length - 1];
        const lang = Lang.i();

        if (first) {
            this._points?.addSighting(
                SightingMapObjectType.Start,
                'start',
                `${AdminListUi.escape(lang.l('Start of track'))}: <b>${moment(first.timestamp).format('HH:mm:ss')}</b>`,
                [first.longitude!, first.latitude!]
            );
        }

        if (last && last !== first) {
            this._points?.addSighting(
                SightingMapObjectType.End,
                'end',
                `${AdminListUi.escape(lang.l('End of track'))}: <b>${moment(last.timestamp).format('HH:mm:ss')}</b>`,
                [last.longitude!, last.latitude!]
            );
        }

        this._sightingRoutes?.refresh();
        this._points?.refresh();

        this._badge?.setContent(`${sightings.length}`);

        await this._renderHeader(data);
        this._renderStats(data, ToursMap.trackStats(this._parsedPositions), sightings.length);
        this._renderPanel(sightings);
        this._updateAreaCounts();

        if (!this._fitView()) {
            let center = orgCenter;

            if (data?.org_id) {
                const org = await OrganizationAPI.getOrganization(data.org_id, true);

                if (org) {
                    center = fromLonLat([parseFloat(org.lon), parseFloat(org.lat)]);
                }
            }

            this._map?.setView(center);
        }

        this._chart?.setData(data?.positions ?? [], data?.sightings ?? []);
        this._renderHighlight();
        this._refreshActionBar();
    }

}