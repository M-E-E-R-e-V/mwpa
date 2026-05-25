import {
    Card,
    ContentCol,
    ContentColSize,
    ContentRow,
    SidebarMenuItem,
    SidebarMenuItemBadge,
    SidebarMenuTree
} from 'bambooo';
import moment from 'moment';
import {Coordinate} from 'ol/coordinate';
import {fromLonLat} from 'ol/proj';
import {Organization as OrganizationAPI} from '../../Api/Organization';
import {Species as SpeciesAPI, SpeciesEntry} from '../../Api/Species';
import {Tours as ToursAPI, ToursTrackingSightingExtended} from '../../Api/Tours';
import {User as UserAPI} from '../../Api/User';
import {BaseMap} from '../../Map/BaseMap';
import {BathymetryLayer} from '../../Map/Layers/BathymetryLayer';
import {OsmBaseLayer} from '../../Map/Layers/OsmBaseLayer';
import {SightingPointsLayer} from '../../Map/Layers/SightingPointsLayer';
import {TourSightingRouteLayer} from '../../Map/Layers/TourSightingRouteLayer';
import {TourTrackLayer} from '../../Map/Layers/TourTrackLayer';
import {SightingMapObjectType} from '../../Map/Styles/SightingStyles';
import {GeolocationCoordinates} from '../../Types/GeolocationCoordinates';
import {UtilDistanceCoast} from '../../Utils/UtilDistanceCoast';
import {UtilLocation} from '../../Utils/UtilLocation';
import {BasePage} from '../BasePage';
import {Tours} from '../Tours';
import {TrackingChart} from './TrackingChart';
import {TransferModal} from './TransferModal';

type TourSightingData = {
    pointtype: string;
    points: number[][];
    timestamp_start: number;
    timestamp_end: number;
    species_id: number;
    species_name: string;
    species_count: number;
    distance_coast: string;
    files: string[];
    extended: ToursTrackingSightingExtended[];
};

export class ToursMap extends BasePage {

    /**
     * page name
     * @protected
     */
    protected override _name: string = 'tour_map';

    /**
     * Tour id
     * @protected
     */
    protected _tourId: number;

    /**
     * @protected
     */
    protected _map: BaseMap | null = null;

    /**
     * @protected
     */
    protected _track: TourTrackLayer | null = null;

    /**
     * @protected
     */
    protected _sightingRoutes: TourSightingRouteLayer | null = null;

    /**
     * @protected
     */
    protected _points: SightingPointsLayer | null = null;

    /**
     * Separate vector layer for the brushed-range highlight, so the
     * underlying boat/sighting features stay rendered with their normal
     * styles while we toggle the overlay on/off.
     * @protected
     */
    protected _highlight: SightingPointsLayer | null = null;

    /**
     * @protected
     */
    protected _badge: SidebarMenuItemBadge | null = null;

    /**
     * Chart above the map (count bars + speed line).
     * @protected
     */
    protected _chart: TrackingChart | null = null;

    /**
     * Reusable transfer modal (admins only).
     * @protected
     */
    protected _transferModal: TransferModal | null = null;

    /**
     * Cached parsed positions for fast highlight repaint.
     * @protected
     */
    protected _parsedPositions: GeolocationCoordinates[] = [];

    /**
     * Currently brushed range, or null.
     * @protected
     */
    protected _brushRange: {timestampFrom: number; timestampTo: number;} | null = null;

    /**
     * Card containing the action bar — used to rebuild after reload.
     * @protected
     */
    protected _actionBar: {
        info: JQuery<HTMLDivElement>;
        btnDelete: JQuery<HTMLButtonElement>;
        btnTransfer: JQuery<HTMLButtonElement>;
    } | null = null;

    /**
     * Pinned reload trigger (set during loadContent so action handlers can call it).
     * @protected
     */
    protected _reload: (() => Promise<void>) | null = null;

    public constructor(tourId: number) {
        super();
        this._tourId = tourId;
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
    }

    public override async loadContent(): Promise<void> {
        const menuItem = this._wrapper.getMainSidebar().getSidebar().getMenu().getMenuItem(Tours.NAME);
        let menuTree: SidebarMenuTree | null = null;

        const title = `Tour #${this._tourId}`;

        if (menuItem !== null) {
            menuTree = new SidebarMenuTree(menuItem);
            const pmenuItem = new SidebarMenuItem(menuTree, true);
            pmenuItem.setTitle(title);
            pmenuItem.setActiv(true);

            this._badge = new SidebarMenuItemBadge(pmenuItem);
            this._badge.setContent('0');
        }

        const contentWrapper = this._wrapper.getContentWrapper().getContent();

        // chart card --------------------------------------------------------------------------------------------------

        const rowChart = new ContentRow(contentWrapper);
        const chartCard = new Card(new ContentCol(rowChart, ContentColSize.col12));
        chartCard.setTitle('Tracking points · time / count / speed');

        const chartTools = chartCard.getToolsElement();

        // Bucket-size select — default 10 minutes (user request).
        const bucketLabel = jQuery('<span class="text-muted small pr-1">Bucket</span>').appendTo(chartTools);
        bucketLabel.css('vertical-align', 'middle');

        const bucketSelect = jQuery<HTMLSelectElement>('<select class="form-control form-control-sm d-inline-block" style="width: auto;"/>').appendTo(chartTools);
        for (const minutes of [1, 5, 10, 15, 30, 60]) {
            const opt = jQuery('<option/>').attr('value', `${minutes}`).text(`${minutes} min`);
            if (minutes === 10) {
                opt.attr('selected', 'selected');
            }
            bucketSelect.append(opt);
        }

        const chartHost = jQuery('<div class="tour-tracking-chart"/>').appendTo(chartCard.getBodyElement());

        this._chart = new TrackingChart(chartHost[0] as HTMLElement);

        bucketSelect.on('change', () => {
            const minutes = parseInt(bucketSelect.val() as string, 10);
            if (Number.isFinite(minutes) && minutes > 0 && this._chart) {
                this._chart.setBucketMinutes(minutes);
            }
        });

        // map card ----------------------------------------------------------------------------------------------------

        const rowMap = new ContentRow(contentWrapper);
        const card = new Card(new ContentCol(rowMap, ContentColSize.col12));
        card.setTitle(title);

        this._map = new BaseMap(card.getBodyElement());

        const wHeight = jQuery(window).height();
        if (wHeight) {
            // The chart card eats ~240px on top of what the map card already
            // had reserved — back off another 200px so the page still fits.
            this._map.setHeight(Math.max(320, wHeight - 420));
        }

        this._map.load({
            initialCenterLonLat: [11.030, 47.739],
            initialZoom: 2.2
        });

        this._map.addLayer(new OsmBaseLayer());
        this._map.addLayer(new BathymetryLayer());

        this._track = new TourTrackLayer();
        this._sightingRoutes = new TourSightingRouteLayer();
        this._points = new SightingPointsLayer();
        this._highlight = new SightingPointsLayer();

        // BaseMap.addLayer is keyed by getName() — two SightingPointsLayer
        // instances would collide and the second would evict the first.
        // Give the highlight a distinct name so both stay registered.
        this._highlight.getName = (): string => 'tracking_highlight_layer';
        this._highlight.getTitle = (): string => 'Tracking selection';

        this._map.addLayer(this._track);
        this._map.addLayer(this._sightingRoutes);
        this._map.addLayer(this._highlight);
        this._map.addLayer(this._points);

        // Highlight needs to sit ABOVE the boat track (z=60) and the
        // per-sighting route lines (z=70) so the brushed dots are
        // actually visible, but BELOW the sighting markers (z=99) so
        // those stay clickable.
        const highlightOl = this._highlight.getOlLayer();
        if (highlightOl && typeof highlightOl.setZIndex === 'function') {
            highlightOl.setZIndex(80);
        }

        const currentuser = await UserAPI.getUserInfo();
        const isAdmin = currentuser?.user?.isAdmin === true;

        let viewCenter: Coordinate | null = null;

        if (currentuser && currentuser.organization) {
            viewCenter = fromLonLat([
                parseFloat(currentuser.organization.lon),
                parseFloat(currentuser.organization.lat)
            ]);
        }

        // action bar (admin only) -------------------------------------------------------------------------------------

        if (isAdmin) {
            this._buildActionBar(chartCard.getBodyElement());
            this._transferModal = new TransferModal(contentWrapper);
        }

        // chart brush → highlight + action enable ---------------------------------------------------------------------

        this._chart.onBrush((range) => {
            this._brushRange = range;
            this._renderHighlight();
            this._refreshActionBar();
        });

        // reload pipeline ---------------------------------------------------------------------------------------------

        this._reload = async(): Promise<void> => {
            await this._loadTrackingData(card, title, viewCenter);
        };

        await this._reload();
    }

    /**
     * Builds the inline Delete / Transfer button strip + status text.
     * Only called when the current user is an admin.
     */
    private _buildActionBar(host: JQuery<HTMLElement>): void {
        const bar = jQuery<HTMLDivElement>(
            '<div class="d-flex align-items-center pt-2" style="gap: 0.5rem;">' +
            '<div class="text-muted small flex-grow-1"></div>' +
            '<button type="button" class="btn btn-sm btn-outline-danger" disabled><i class="fas fa-trash"></i> Delete range</button>' +
            '<button type="button" class="btn btn-sm btn-outline-primary" disabled><i class="fas fa-exchange-alt"></i> Transfer range…</button>' +
            '</div>'
        );

        host.append(bar);

        const info = bar.find('div.text-muted') as unknown as JQuery<HTMLDivElement>;
        const btnDelete = bar.find('button.btn-outline-danger') as unknown as JQuery<HTMLButtonElement>;
        const btnTransfer = bar.find('button.btn-outline-primary') as unknown as JQuery<HTMLButtonElement>;

        info.text('Brush a range on the chart to enable actions.');

        btnDelete.on('click', () => {
            this._handleDelete();
        });

        btnTransfer.on('click', () => {
            this._handleTransfer();
        });

        this._actionBar = {info, btnDelete, btnTransfer};
    }

    /**
     * Re-renders the highlight layer based on `_brushRange` over `_parsedPositions`.
     */
    private _renderHighlight(): void {
        if (!this._highlight) {
            return;
        }
        this._highlight.clearFeatures();

        if (!this._brushRange) {
            this._highlight.refresh();
            return;
        }

        const {timestampFrom, timestampTo} = this._brushRange;
        for (const pos of this._parsedPositions) {
            if (pos.timestamp === undefined || pos.longitude === undefined || pos.latitude === undefined) {
                continue;
            }
            if (pos.timestamp < timestampFrom || pos.timestamp > timestampTo) {
                continue;
            }
            this._highlight.addSighting(
                SightingMapObjectType.TrackingHighlight,
                `hl-${pos.timestamp}`,
                `Tracking @ ${moment(pos.timestamp).format('HH:mm:ss')}`,
                [pos.longitude, pos.latitude]
            );
        }
        this._highlight.refresh();
    }

    private _selectedCount(): number {
        if (!this._brushRange) {
            return 0;
        }
        const {timestampFrom, timestampTo} = this._brushRange;
        let n = 0;
        for (const pos of this._parsedPositions) {
            if (pos.timestamp !== undefined &&
                pos.timestamp >= timestampFrom &&
                pos.timestamp <= timestampTo) {
                n++;
            }
        }
        return n;
    }

    private _refreshActionBar(): void {
        if (!this._actionBar) {
            return;
        }
        const count = this._selectedCount();
        if (count === 0 || !this._brushRange) {
            this._actionBar.info.text('Brush a range on the chart to enable actions.');
            this._actionBar.btnDelete.attr('disabled', 'disabled');
            this._actionBar.btnTransfer.attr('disabled', 'disabled');
            return;
        }
        const from = moment(this._brushRange.timestampFrom).format('HH:mm:ss');
        const to = moment(this._brushRange.timestampTo).format('HH:mm:ss');
        this._actionBar.info.text(`Selection: ${from} → ${to} · ${count} points`);
        this._actionBar.btnDelete.removeAttr('disabled');
        this._actionBar.btnTransfer.removeAttr('disabled');
    }

    private async _handleDelete(): Promise<void> {
        if (!this._brushRange) {
            return;
        }
        const count = this._selectedCount();
        // eslint-disable-next-line no-alert
        const ok = window.confirm(`Delete ${count} tracking point(s) in the brushed range? This cannot be undone.`);
        if (!ok) {
            return;
        }
        try {
            const deleted = await ToursAPI.deleteTracking(
                this._tourId,
                this._brushRange.timestampFrom,
                this._brushRange.timestampTo
            );
            this._brushRange = null;
            if (this._chart) {
                this._chart.clearBrush();
            }
            if (this._reload) {
                await this._reload();
            }
            // eslint-disable-next-line no-alert
            window.alert(`Deleted ${deleted} tracking points.`);
        } catch (e) {
            // eslint-disable-next-line no-alert
            window.alert(`Delete failed: ${(e as Error).message}`);
        }
    }

    private async _handleTransfer(): Promise<void> {
        if (!this._brushRange || !this._transferModal) {
            return;
        }
        const count = this._selectedCount();
        const range = this._brushRange;
        const neighbors = await ToursAPI.getTrackingNeighbors(this._tourId);

        this._transferModal.resetValues();
        this._transferModal.setRange(range.timestampFrom, range.timestampTo, count);
        this._transferModal.setNeighbors(neighbors?.prev, neighbors?.next);
        this._transferModal.setOnConfirm(async(targetTourId) => {
            try {
                const transferred = await ToursAPI.transferTracking(
                    this._tourId,
                    targetTourId,
                    range.timestampFrom,
                    range.timestampTo
                );
                this._transferModal?.hide();
                this._brushRange = null;
                if (this._chart) {
                    this._chart.clearBrush();
                }
                if (this._reload) {
                    await this._reload();
                }
                // eslint-disable-next-line no-alert
                window.alert(`Transferred ${transferred} tracking points to tour #${targetTourId}.`);
            } catch (e) {
                // eslint-disable-next-line no-alert
                window.alert(`Transfer failed: ${(e as Error).message}`);
            }
        });
        this._transferModal.show();
    }

    /**
     * Loads tracking + species from the backend and rebuilds the map +
     * chart from scratch. Used both for the first paint and after every
     * delete/transfer.
     */
    private async _loadTrackingData(card: Card, title: string, defaultViewCenter: Coordinate | null): Promise<void> {
        if (this._map) {
            this._map.setView(defaultViewCenter);
        }

        // species -----------------------------------------------------------------------------------------------------

        const species = await SpeciesAPI.getList();
        const mspecies = new Map<number, SpeciesEntry>();

        if (species) {
            for (const tspecies of species) {
                mspecies.set(tspecies.id, tspecies);
            }
        }

        const trackingData = await ToursAPI.getTrackingList(this._tourId);

        // Reset buffered features so reload doesn't duplicate them.
        if (this._track) {
            this._track.setTrack([]);
            this._track.refresh();
        }
        this._sightingRoutes?.clearFeatures();
        this._points?.clearFeatures();
        this._highlight?.clearFeatures();
        this._highlight?.refresh();
        this._parsedPositions = [];

        if (!trackingData) {
            this._chart?.setData([], []);
            this._sightingRoutes?.refresh();
            this._points?.refresh();
            return;
        }

        const org = await OrganizationAPI.getOrganization(trackingData.org_id);

        if (org && this._map) {
            const orgViewCenter = fromLonLat([
                parseFloat(org.lon),
                parseFloat(org.lat)
            ]);
            this._map.setView(orgViewCenter);
        }

        const trackDate = moment(trackingData.date?.split(' ')[0]);
        card.setTitle(`${title} - <b>${trackDate.format('YYYY.MM.DD')}</b> - begin: ${trackingData.start} end: ${trackingData.end}`);

        const positionSort = new Map<number, GeolocationCoordinates>();
        const sighPostionTrack = new Map<number, TourSightingData>();

        if (trackingData.sightings.length > 0 && this._badge) {
            this._badge.setContent(`${trackingData.sightings.length}`);
        }

        for (const sighting of trackingData.sightings) {
            const sightPostionTrackData: TourSightingData = {
                points: [],
                pointtype: sighting.pointtype,
                timestamp_start: 0,
                timestamp_end: 0,
                species_id: sighting.species_id,
                species_name: sighting.species_name,
                species_count: sighting.species_count,
                distance_coast: sighting.distance_coast,
                files: sighting.files,
                extended: sighting.extended
            };

            try {
                const posObjBegin = JSON.parse(sighting.location_begin) as GeolocationCoordinates;
                if (posObjBegin.timestamp) {
                    sightPostionTrackData.timestamp_start = posObjBegin.timestamp;
                }
            } catch (e) {
                console.log(e);
            }

            try {
                const posObjEnd = JSON.parse(sighting.location_end) as GeolocationCoordinates;
                if (posObjEnd.timestamp) {
                    sightPostionTrackData.timestamp_end = posObjEnd.timestamp;
                }
            } catch (e) {
                console.log(e);
            }

            sighPostionTrack.set(sighting.id, sightPostionTrackData);
        }

        for (const position of trackingData.positions) {
            try {
                const posObj = JSON.parse(position) as GeolocationCoordinates;
                if (posObj.timestamp) {
                    positionSort.set(posObj.timestamp, posObj);
                }
            } catch (e) {
                console.log(e);
            }
        }

        const positionListObj = [...positionSort].sort();

        const coordList: number[][] = [];

        let index = 0;
        let start: GeolocationCoordinates | null = null;
        let end: GeolocationCoordinates | null = null;

        for (const [timestamp, value] of positionListObj) {
            if (index === 0) {
                start = value;
            }

            if (value.longitude && value.latitude) {
                for (const [sightingid, sighting] of sighPostionTrack) {
                    if (timestamp >= sighting.timestamp_start && timestamp <= sighting.timestamp_end) {
                        sighting.points.push([value.longitude, value.latitude]);
                    }
                    sighPostionTrack.set(sightingid, sighting);
                }

                coordList.push([value.longitude, value.latitude]);
                this._parsedPositions.push(value);

                if (index > 0 && (index % 400 === 0) && end && this._points) {
                    this._points.addRawObject({
                        type: 'Feature',
                        properties: {
                            pointtype: 'boat',
                            start: [end.longitude, end.latitude],
                            end: [value.longitude, value.latitude]
                        },
                        geometry: {
                            type: 'Point',
                            coordinates: [value.longitude, value.latitude]
                        }
                    });
                }

                end = value;
                index++;
            }
        }

        for (const [sightingId, sighting] of sighPostionTrack) {
            if (!sighting.points || !sighting.points[0] || (sighting.points[0].length !== 2)) {
                // eslint-disable-next-line no-continue
                continue;
            }

            if (this._sightingRoutes) {
                this._sightingRoutes.addSightingRoute(sighting.pointtype, sighting.points);
            }

            const speciesEntry = mspecies.get(sighting.species_id);
            let speciesName = '';

            if (speciesEntry) {
                speciesName = speciesEntry.name;
            } else {
                speciesName = sighting.species_name;
            }

            const floatDistance = parseFloat(sighting.distance_coast!) || 0;

            let latStr = '';
            let lonStr = '';

            try {
                const lat = UtilLocation.ddToDm(sighting.points[0][1], true);
                latStr = `${lat.direction}: ${lat.degree}º ${lat.minute.toFixed(3)}`;
            } catch (e) {
                console.log(e);
            }

            try {
                const lon = UtilLocation.ddToDm(sighting.points[0][0], false);
                lonStr = `${lon.direction}: ${lon.degree}º ${lon.minute.toFixed(3)}`;
            } catch (e) {
                console.log(e);
            }

            let images = '';

            for (const file of sighting.files) {
                images += `<br><img width="200px" src="/json/sightings/getimage/${sightingId}/${file}" alt="${file}">`;
            }

            let speStartTimeStr = 'unknown';

            if (sighting.timestamp_start) {
                const speStartTime = moment(sighting.timestamp_start);
                speStartTimeStr = speStartTime.format('YYYY.MM.DD HH:mm:ss');
            }

            let extendedStr = '';

            for (const extended of sighting.extended) {
                switch (extended.name) {
                    case 'depth_contour':
                        extendedStr += `<b>Sea depth</b>: ${extended.data} m<br>`;
                        break;
                }
            }

            if (this._points) {
                this._points.addSighting(
                    sighting.pointtype,
                    sightingId,
                    `<b>Species</b>: ${speciesName}<br>` +
                    `<b>Group-Size</b>: ${sighting.species_count}<br>` +
                    `<b>Distance (Miles)</b>: ${UtilDistanceCoast.meterToM(floatDistance, true)}<br>` +
                    `<b>Date/Time</b>: ${speStartTimeStr}<br>` +
                    `<b>Position</b>: ${latStr} - ${lonStr}<br>${images}<br>` +
                    `${extendedStr}`,
                    sighting.points[0]
                );
            }
        }

        if (this._track) {
            this._track.setTrack(coordList);
            this._track.refresh();
        }

        if (start && this._points && start.longitude && start.latitude) {
            const startTime = moment(start.timestamp);
            this._points.addSighting(
                SightingMapObjectType.Start,
                'start',
                `Tour-Start at: <b>${startTime.format('YYYY.MM.DD HH:mm:ss')}</b>`,
                [start.longitude, start.latitude]
            );
        }

        if (end && this._points && end.longitude && end.latitude) {
            const endTime = moment(end.timestamp);
            this._points.addSighting(
                SightingMapObjectType.End,
                'end',
                `Tour-End at: <b>${endTime.format('YYYY.MM.DD HH:mm:ss')}</b>`,
                [end.longitude, end.latitude]
            );
        }

        this._sightingRoutes?.refresh();
        this._points?.refresh();

        // Feed the chart with the same data. Bucket size is whatever the
        // user picked on the toolbar.
        if (this._chart) {
            this._chart.setData(trackingData.positions, trackingData.sightings);
        }

        this._renderHighlight();
        this._refreshActionBar();
    }

}