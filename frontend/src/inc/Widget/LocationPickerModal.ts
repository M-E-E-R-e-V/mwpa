/* global JQuery */
import {ComponentType, LangText, ModalDialog, ModalDialogType} from 'bambooo';
import moment from 'moment';
import {fromLonLat, toLonLat} from 'ol/proj';
import {Lang} from '../Lang';
import {GeolocationCoordinates} from '../Types/GeolocationCoordinates';
import {SightingMap, SightingMapObjectType} from './SightingMap';

/**
 * Compass label for a heading in degrees (0..360). 16-wind, 22.5° per
 * sector. Used by the picker-info panel to make raw heading numbers
 * readable at a glance.
 */
const compassLabel = (deg: number): string => {
    const sectors = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE',
        'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
    const normalised = ((deg % 360) + 360) % 360;
    return sectors[Math.round(normalised / 22.5) % 16];
};

export type LocationPickerCallback = (value: GeolocationCoordinates | null) => void;

const escapeHtml = (s: string): string => s
.replace(/&/gu, '&amp;')
.replace(/</gu, '&lt;')
.replace(/>/gu, '&gt;')
.replace(/"/gu, '&quot;');

const parseNum = (s: string): number => {
    const v = parseFloat(s.replace(',', '.'));
    return Number.isNaN(v) ? 0 : v;
};

/**
 * Convert decimal degrees to {direction, degree, minute} for the lat or lon
 * axis. Uses minutes-of-arc (× 60), not the legacy * 0.6 idiom from
 * UtilLocation — the picker is the single place where we re-edit positions
 * so the sane convention is applied here, and converted back to decimal
 * before storing.
 */
const ddToDmEdit = (coord: number, isLat: boolean): {direction: string; degree: number; minute: number;} => {
    let direction = '';
    if (isLat) {
        direction = coord >= 0 ? 'N' : 'S';
    } else {
        direction = coord >= 0 ? 'E' : 'W';
    }
    const abs = Math.abs(coord);
    const degree = Math.floor(abs);
    const minute = (abs - degree) * 60;
    return {direction, degree, minute};
};

const dmToDd = (direction: string, degree: number, minute: number): number => {
    const sign = direction === 'S' || direction === 'W' ? -1 : 1;
    return sign * (degree + (minute / 60));
};

/**
 * Location-picker modal: side-by-side input panel + live OpenLayers map. The
 * input panel offers two tabs (decimal Lat/Lon and DM with N/S/E/W) that stay
 * synchronised — typing in either updates the other and the map marker. An
 * optional polyline route (e.g. the surrounding tour's GPS track) is shown on
 * the map for orientation.
 */
export class LocationPickerModal extends ModalDialog {

    protected _map: SightingMap | null = null;

    protected _mapInitialised: boolean = false;

    protected _value: GeolocationCoordinates | null = null;

    /**
     * The surrounding tour's tracking points (ordered by timestamp asc).
     * Used both to draw the route polyline on the map and to look up
     * per-point metadata (time/speed/heading) for the picker-info panel.
     * @protected
     */
    protected _route: GeolocationCoordinates[] | null = null;

    protected _onPicked: LocationPickerCallback | null = null;

    protected _readOnlyContent: boolean = false;

    /* Decimal tab inputs. */
    protected _decLatInput: JQuery<HTMLInputElement>;

    protected _decLonInput: JQuery<HTMLInputElement>;

    /* DM tab inputs. */
    protected _dmLatDir: JQuery<HTMLSelectElement>;

    protected _dmLatDeg: JQuery<HTMLInputElement>;

    protected _dmLatMin: JQuery<HTMLInputElement>;

    protected _dmLonDir: JQuery<HTMLSelectElement>;

    protected _dmLonDeg: JQuery<HTMLInputElement>;

    protected _dmLonMin: JQuery<HTMLInputElement>;

    protected _mapContainer: JQuery<HTMLDivElement>;

    /**
     * Empty-state hint shown only when the surrounding tour has no
     * tracking points to draw — otherwise the route line on the map
     * speaks for itself.
     * @protected
     */
    protected _noTrackInfo: JQuery<HTMLDivElement>;

    /**
     * Toggle to override the snap-to-route constraint. Only visible
     * when a route is present; checked → free pick, unchecked → snap.
     * @protected
     */
    protected _freePickWrap: JQuery<HTMLDivElement>;

    /**
     * @protected
     */
    protected _freePickInput: JQuery<HTMLInputElement>;

    /**
     * Info panel below the free-pick checkbox. Shows the nearest tour
     * tracking point's timestamp / speed / heading / distance whenever a
     * value is set AND a route is available. Empty / hidden otherwise.
     * @protected
     */
    protected _trackInfoWrap: JQuery<HTMLDivElement>;

    /**
     * Whether the next {@link _setValue} should snap to the route.
     * Driven by {@link _freePickInput} and the presence of a route.
     * @protected
     */
    protected _snapEnabled: boolean = true;

    /**
     * Optional reference position the pick must come AFTER along the
     * route (e.g. the sighting's begin position when picking end). If
     * the pick maps to an earlier vertex index than this reference, a
     * warning is shown. Null disables the check.
     * @protected
     */
    protected _mustBeAfter: GeolocationCoordinates | null = null;

    /**
     * Warning bar shown when the pick violates {@link _mustBeAfter}.
     * Soft enforcement — save is still allowed, but the user is told
     * the position looks wrong relative to the boat's travel direction.
     * @protected
     */
    protected _orderWarning: JQuery<HTMLDivElement>;

    /* Guard so the DM/Dec sync doesn't infinite-loop. */
    protected _suspendSync: boolean = false;

    public constructor(elementObject: ComponentType) {
        super(elementObject, `locationpickermodal-${Date.now()}`, ModalDialogType.xlarge);

        const lang = Lang.i();

        this.setTitle(new LangText('Pick position'));

        const bodyCard = jQuery('<div class="card-body location-picker-body"/>').appendTo(this._body);
        const row = jQuery('<div class="row"/>').appendTo(bodyCard);
        const colLeft = jQuery('<div class="col-md-5 location-picker-form"/>').appendTo(row);
        const colRight = jQuery('<div class="col-md-7 location-picker-mapcol"/>').appendTo(row);

        // Tab nav.
        const tabsId = `loc-tabs-${Date.now()}`;
        const tabNav = jQuery(`<ul class="nav nav-tabs" id="${tabsId}"/>`).appendTo(colLeft);
        const tabContent = jQuery('<div class="tab-content location-picker-tabs"/>').appendTo(colLeft);

        const decTabId = `loc-dec-${Date.now()}`;
        const dmTabId = `loc-dm-${Date.now()}`;

        tabNav.append(`<li class="nav-item"><a class="nav-link active" data-toggle="tab" href="#${decTabId}">${escapeHtml(lang.l('Lat / Lon (decimal)'))}</a></li>`);
        tabNav.append(`<li class="nav-item"><a class="nav-link" data-toggle="tab" href="#${dmTabId}">${escapeHtml(lang.l('Deg / Min (N/S/E/W)'))}</a></li>`);

        // Decimal pane.
        const decPane = jQuery(`<div class="tab-pane fade show active pt-2" id="${decTabId}"/>`).appendTo(tabContent);
        decPane.append(`<label class="small mb-0">${escapeHtml(lang.l('Latitude'))}</label>`);
        this._decLatInput = jQuery<HTMLInputElement>('<input type="text" class="form-control form-control-sm" placeholder="28.052500"/>').appendTo(decPane);
        decPane.append(`<label class="small mb-0 mt-2">${escapeHtml(lang.l('Longitude'))}</label>`);
        this._decLonInput = jQuery<HTMLInputElement>('<input type="text" class="form-control form-control-sm" placeholder="-17.334022"/>').appendTo(decPane);

        // DM pane.
        const dmPane = jQuery(`<div class="tab-pane fade pt-2" id="${dmTabId}"/>`).appendTo(tabContent);

        dmPane.append(`<label class="small mb-0">${escapeHtml(lang.l('Latitude'))}</label>`);
        const latRow = jQuery('<div class="form-row"/>').appendTo(dmPane);
        this._dmLatDir = jQuery<HTMLSelectElement>('<select class="form-control form-control-sm col-3"><option value="N">N</option><option value="S">S</option></select>').appendTo(latRow);
        this._dmLatDeg = jQuery<HTMLInputElement>('<input type="number" min="0" max="89" class="form-control form-control-sm col-4 ml-1" placeholder="deg"/>').appendTo(latRow);
        this._dmLatMin = jQuery<HTMLInputElement>('<input type="number" step="0.001" min="0" max="60" class="form-control form-control-sm col-4 ml-1" placeholder="min"/>').appendTo(latRow);

        dmPane.append(`<label class="small mb-0 mt-2">${escapeHtml(lang.l('Longitude'))}</label>`);
        const lonRow = jQuery('<div class="form-row"/>').appendTo(dmPane);
        this._dmLonDir = jQuery<HTMLSelectElement>('<select class="form-control form-control-sm col-3"><option value="E">E</option><option value="W">W</option></select>').appendTo(lonRow);
        this._dmLonDeg = jQuery<HTMLInputElement>('<input type="number" min="0" max="179" class="form-control form-control-sm col-4 ml-1" placeholder="deg"/>').appendTo(lonRow);
        this._dmLonMin = jQuery<HTMLInputElement>('<input type="number" step="0.001" min="0" max="60" class="form-control form-control-sm col-4 ml-1" placeholder="min"/>').appendTo(lonRow);

        const freePickId = `loc-freepick-${Date.now()}`;
        this._freePickWrap = jQuery<HTMLDivElement>('<div class="custom-control custom-checkbox mt-3" style="display:none;"/>').appendTo(colLeft);
        this._freePickInput = jQuery<HTMLInputElement>(`<input type="checkbox" class="custom-control-input" id="${freePickId}"/>`).appendTo(this._freePickWrap);
        jQuery(`<label class="custom-control-label" for="${freePickId}">${escapeHtml(lang.l('Pick freely (off-route)'))}</label>`).appendTo(this._freePickWrap);

        this._trackInfoWrap = jQuery<HTMLDivElement>('<div class="small mt-2" style="display:none;"/>').appendTo(colLeft);

        this._orderWarning = jQuery<HTMLDivElement>('<div class="alert alert-warning py-2 px-3 mt-2 small" style="display:none;"/>').appendTo(colLeft);

        /*
         * Map container — SightingMap is mounted lazily on first show() so its
         * OpenLayers init doesn't run when the modal is hidden (size=0 → broken render).
         */
        this._mapContainer = jQuery<HTMLDivElement>('<div class="location-picker-map"/>').appendTo(colRight);
        this._noTrackInfo = jQuery<HTMLDivElement>(`<div class="small text-muted mt-2" style="display:none;">${escapeHtml(lang.l('No tracking points'))}</div>`).appendTo(colRight);

        // Footer buttons.
        this.addButtonClose(new LangText('Close'));
        this.addButtonSave(new LangText('Use this position'));

        this._wireInputs();
        this._wireFreePick();

        this.setOnSave(async() => {
            if (this._onPicked) {
                this._onPicked(this._value);
            }
            this.hide();
        });
    }

    /**
     * Open the modal pre-populated with the given coordinates and (optional)
     * tour route. The callback fires when the user accepts.
     */
    public open(
        initial: GeolocationCoordinates | null,
        route: GeolocationCoordinates[] | null,
        onPicked: LocationPickerCallback,
        mustBeAfter: GeolocationCoordinates | null = null
    ): void {
        this._value = initial ? {...initial} : null;
        this._route = route;
        this._onPicked = onPicked;
        this._mustBeAfter = mustBeAfter;

        this._suspendSync = true;
        this._fillFromValue();
        this._suspendSync = false;

        this.show();

        // Map needs to lay out *after* the modal is visible — defer one tick.
        setTimeout(() => {
            this._ensureMap();
            this._renderMapState();
        }, 50);
    }

    /**
     * Update the surrounding tour route after the modal has opened — used when
     * the route is loaded asynchronously after the user clicked the picker
     * button. No-op if the map hasn't been mounted yet (it'll pick up the route
     * from `_route` on its next render).
     */
    public setRoute(route: GeolocationCoordinates[]|null): void {
        this._route = route;
        if (this._mapInitialised) {
            this._renderMapState();
        }
    }

    public override resetValues(): void {
        this._value = null;
        this._route = null;
        this._onPicked = null;
        this._mustBeAfter = null;
        this._snapEnabled = true;
        this._freePickInput.prop('checked', false);
        this._suspendSync = true;
        this._decLatInput.val('');
        this._decLonInput.val('');
        this._dmLatDir.val('N');
        this._dmLatDeg.val('');
        this._dmLatMin.val('');
        this._dmLonDir.val('E');
        this._dmLonDeg.val('');
        this._dmLonMin.val('');
        this._suspendSync = false;
        this._trackInfoWrap.hide().empty();
        this._orderWarning.hide().empty();
    }

    protected _wireInputs(): void {
        const decHandler = (): void => {
            if (this._suspendSync) {
                return;
            }
            const lat = parseNum(this._decLatInput.val() as string);
            const lon = parseNum(this._decLonInput.val() as string);
            this._setValue({latitude: lat, longitude: lon, timestamp: Date.now()});
            /*
             * Refill BOTH panes so any snap-to-route adjustment is
             * visible immediately wherever the user is looking.
             */
            this._suspendSync = true;
            this._fillFromValue();
            this._suspendSync = false;
            this._renderMapState();
        };
        this._decLatInput.on('input', decHandler);
        this._decLonInput.on('input', decHandler);

        const dmHandler = (): void => {
            if (this._suspendSync) {
                return;
            }
            const lat = dmToDd(this._dmLatDir.val() as string, parseNum(this._dmLatDeg.val() as string), parseNum(this._dmLatMin.val() as string));
            const lon = dmToDd(this._dmLonDir.val() as string, parseNum(this._dmLonDeg.val() as string), parseNum(this._dmLonMin.val() as string));
            this._setValue({latitude: lat, longitude: lon, timestamp: Date.now()});
            this._suspendSync = true;
            this._fillFromValue();
            this._suspendSync = false;
            this._renderMapState();
        };
        this._dmLatDir.on('change', dmHandler);
        this._dmLonDir.on('change', dmHandler);
        this._dmLatDeg.on('input', dmHandler);
        this._dmLatMin.on('input', dmHandler);
        this._dmLonDeg.on('input', dmHandler);
        this._dmLonMin.on('input', dmHandler);
    }

    /**
     * @protected
     */
    protected _wireFreePick(): void {
        this._freePickInput.on('change', () => {
            this._snapEnabled = !this._freePickInput.prop('checked');
            /*
             * If snap was just re-enabled, re-apply it to the current
             * value so the user sees the picked position jump back
             * onto the route immediately.
             */
            if (this._snapEnabled && this._value !== null) {
                this._setValue({...this._value});
                this._suspendSync = true;
                this._fillFromValue();
                this._suspendSync = false;
                this._renderMapState();
            }
        });
    }

    protected _setValue(v: GeolocationCoordinates): void {
        if (this._snapEnabled
            && this._route !== null
            && this._route.length > 1
            && v.latitude !== undefined
            && v.longitude !== undefined
            && Number.isFinite(v.latitude)
            && Number.isFinite(v.longitude)
        ) {
            const snapped = LocationPickerModal._snapToRoute(v.latitude, v.longitude, this._route);
            if (snapped !== null) {
                this._value = {...v, latitude: snapped.lat, longitude: snapped.lon};
                return;
            }
        }
        this._value = v;
    }

    /**
     * Pull just the [lon, lat] vertex list from the typed route — used
     * everywhere snap math / polyline drawing doesn't care about
     * timestamp/speed. Drops vertices with missing coordinates so callers
     * can pass the raw route as-is.
     * @protected
     */
    protected static _routeCoords(route: GeolocationCoordinates[]): number[][] {
        const coords: number[][] = [];
        for (const p of route) {
            if (p.latitude !== undefined && p.longitude !== undefined) {
                coords.push([p.longitude, p.latitude]);
            }
        }
        return coords;
    }

    /**
     * Project (lat, lon) onto the polyline `route` (array of [lon, lat]
     * vertices, EPSG:4326). Returns the closest point ON the line —
     * either a vertex or an interpolated point on a segment — in
     * EPSG:4326. Distance math is done in Web Mercator metres so
     * single-degree errors at lat 28° stay sub-metre. Null route or a
     * degenerate single point yields null (caller keeps raw input).
     * @protected
     */
    protected static _snapToRoute(
        lat: number,
        lon: number,
        route: GeolocationCoordinates[]
    ): {lat: number; lon: number;} | null {
        const coords = LocationPickerModal._routeCoords(route);
        if (coords.length < 2) {
            return null;
        }

        const [px, py] = fromLonLat([lon, lat]);

        let bestX = px;
        let bestY = py;
        let bestD2 = Number.POSITIVE_INFINITY;

        for (let i = 0; i < coords.length - 1; i++) {
            const [a0, a1] = fromLonLat(coords[i]);
            const [b0, b1] = fromLonLat(coords[i + 1]);

            const dx = b0 - a0;
            const dy = b1 - a1;
            const lenSq = (dx * dx) + (dy * dy);

            let t = 0;
            if (lenSq > 0) {
                t = (((px - a0) * dx) + ((py - a1) * dy)) / lenSq;
                t = Math.max(0, Math.min(1, t));
            }

            const cx = a0 + (t * dx);
            const cy = a1 + (t * dy);
            const ex = px - cx;
            const ey = py - cy;
            const d2 = (ex * ex) + (ey * ey);

            if (d2 < bestD2) {
                bestD2 = d2;
                bestX = cx;
                bestY = cy;
            }
        }

        const [snapLon, snapLat] = toLonLat([bestX, bestY]);
        return {lat: snapLat, lon: snapLon};
    }

    protected _fillFromValue(): void {
        this._fillDecFromValue();
        this._fillDmFromValue();
    }

    protected _fillDecFromValue(): void {
        if (this._value && this._value.latitude !== undefined && this._value.longitude !== undefined) {
            this._decLatInput.val(this._value.latitude.toFixed(6));
            this._decLonInput.val(this._value.longitude.toFixed(6));
        } else {
            this._decLatInput.val('');
            this._decLonInput.val('');
        }
    }

    protected _fillDmFromValue(): void {
        if (this._value && this._value.latitude !== undefined && this._value.longitude !== undefined) {
            const lat = ddToDmEdit(this._value.latitude, true);
            const lon = ddToDmEdit(this._value.longitude, false);
            this._dmLatDir.val(lat.direction);
            this._dmLatDeg.val(lat.degree);
            this._dmLatMin.val(lat.minute.toFixed(3));
            this._dmLonDir.val(lon.direction);
            this._dmLonDeg.val(lon.degree);
            this._dmLonMin.val(lon.minute.toFixed(3));
        } else {
            this._dmLatDir.val('N');
            this._dmLatDeg.val('');
            this._dmLatMin.val('');
            this._dmLonDir.val('E');
            this._dmLonDeg.val('');
            this._dmLonMin.val('');
        }
    }

    protected _ensureMap(): void {
        if (this._mapInitialised) {
            return;
        }

        this._map = new SightingMap(this._mapContainer);
        this._map.setHeight(360);
        this._map.load({useHeatmap: false, useBathymetriemap: false});
        this._mapInitialised = true;

        // Click-to-pick: forward map clicks into _setValue (which honours
        // snap-to-route) and refresh both input panes + the marker so the
        // user can drop a point anywhere on the map instead of typing.
        const olMap = this._map.getOlMap();
        if (olMap) {
            olMap.on('click', (evt) => {
                if (this._readOnlyContent) {
                    return;
                }
                const [lon, lat] = toLonLat(evt.coordinate);
                this._setValue({latitude: lat, longitude: lon, timestamp: Date.now()});
                this._suspendSync = true;
                this._fillFromValue();
                this._suspendSync = false;
                this._renderMapState();
            });
        }
    }

    protected _renderMapState(): void {
        if (!this._map) {
            return;
        }

        this._map.clearFeatureList();

        const routeCoords = this._route ? LocationPickerModal._routeCoords(this._route) : [];
        const hasTrack = routeCoords.length > 1;
        if (hasTrack) {
            this._map.addLineRoute(routeCoords);
        }
        this._noTrackInfo.toggle(!hasTrack);
        /*
         * Snap-to-route only makes sense when there is a route — hide
         * the override checkbox otherwise so the UI stays uncluttered.
         */
        this._freePickWrap.toggle(hasTrack);

        let center: number[] | null = null;
        if (this._value && this._value.latitude !== undefined && this._value.longitude !== undefined) {
            this._map.addSighting(
                SightingMapObjectType.PickMarker,
                'picker-marker',
                'Picked position',
                [this._value.longitude, this._value.latitude]
            );
            center = [this._value.longitude, this._value.latitude];
        } else if (routeCoords.length > 0) {
            center = routeCoords[0];
        }

        if (center) {
            this._map.setView(fromLonLat(center));
        }

        this._map.refrech().catch(() => undefined);
        this._map.updateSize();
        this._updateTrackInfo();
        this._updateOrderWarning();
    }

    /**
     * Refresh the info panel below the free-pick checkbox.
     *
     * Shows the nearest tour tracking point (by Web-Mercator distance
     * from the picked position) with its timestamp / speed / heading and
     * the distance from the pick. Hidden when there is no route or no
     * picked value.
     *
     * The distance line lets the user judge at a glance whether their
     * pick IS a tracking point (sub-metre when snap is on and the
     * snapped position lands on a vertex) or just near one.
     * @protected
     */
    protected _updateTrackInfo(): void {
        if (!this._route || this._route.length === 0
            || !this._value
            || this._value.latitude === undefined
            || this._value.longitude === undefined
        ) {
            this._trackInfoWrap.hide().empty();
            return;
        }

        const [px, py] = fromLonLat([this._value.longitude, this._value.latitude]);
        let bestIdx = -1;
        let bestD2 = Number.POSITIVE_INFINITY;

        for (let i = 0; i < this._route.length; i++) {
            const p = this._route[i];
            if (p.latitude === undefined || p.longitude === undefined) {
                continue;
            }
            const [qx, qy] = fromLonLat([p.longitude, p.latitude]);
            const dx = qx - px;
            const dy = qy - py;
            const d2 = (dx * dx) + (dy * dy);
            if (d2 < bestD2) {
                bestD2 = d2;
                bestIdx = i;
            }
        }

        if (bestIdx === -1) {
            this._trackInfoWrap.hide().empty();
            return;
        }

        const point = this._route[bestIdx];
        const distM = Math.sqrt(bestD2);
        const lang = Lang.i();

        // "On this tracking point" when within 2m (snap mode locks onto
        // a vertex), "Nearest tracking point" otherwise. 2m chosen
        // because Mercator-metres at lat 28° are ~accurate enough for
        // intra-vertex precision; in practice anything < 1m means snap
        // landed exactly on the vertex.
        const onPoint = distM < 2;
        const titleKey = onPoint ? 'On this tracking point' : 'Nearest tracking point';
        const titleHtml = `<div class="font-weight-bold">${escapeHtml(lang.l(titleKey) ?? titleKey)}</div>`;

        const lines: string[] = [titleHtml];

        if (point.timestamp) {
            const ts = moment(point.timestamp).format('YYYY-MM-DD HH:mm:ss');
            lines.push(`<div><i class="far fa-clock mr-1"></i>${escapeHtml(ts)}</div>`);
        }
        if (point.speed !== undefined && point.speed !== null) {
            const kmh = point.speed * 3.6;
            const kn = point.speed * 1.943844;
            lines.push(`<div><i class="fas fa-tachometer-alt mr-1"></i>${kmh.toFixed(1)} km/h <span class="text-muted">(${kn.toFixed(1)} kn)</span></div>`);
        }
        if (point.heading !== undefined && point.heading !== null) {
            lines.push(`<div><i class="fas fa-compass mr-1"></i>${point.heading.toFixed(0)}° ${compassLabel(point.heading)}</div>`);
        }
        if (point.altitude !== undefined && point.altitude !== null) {
            lines.push(`<div><i class="fas fa-mountain mr-1"></i>${point.altitude.toFixed(1)} m</div>`);
        }

        // Distance line — always shown so the user can tell "snapped on
        // it" from "nearest of many".
        const distLabel = lang.l('Distance from pick') ?? 'Distance from pick';
        const distColor = onPoint ? 'text-success' : 'text-muted';
        lines.push(`<div class="${distColor}"><i class="fas fa-arrows-alt-h mr-1"></i>${escapeHtml(distLabel)}: ${distM.toFixed(1)} m</div>`);

        this._trackInfoWrap
            .html(lines.join(''))
            .show();
    }

    /**
     * Index of the route vertex closest to the given coordinates in
     * Web-Mercator space. Returns -1 when route/coords are empty or
     * malformed. Shared between the order-warning check and any future
     * callers that need a route position from a free position.
     * @protected
     */
    protected _nearestRouteIndex(lat: number, lon: number): number {
        if (!this._route || this._route.length === 0) {
            return -1;
        }
        const [px, py] = fromLonLat([lon, lat]);
        let bestIdx = -1;
        let bestD2 = Number.POSITIVE_INFINITY;
        for (let i = 0; i < this._route.length; i++) {
            const p = this._route[i];
            if (p.latitude === undefined || p.longitude === undefined) {
                continue;
            }
            const [qx, qy] = fromLonLat([p.longitude, p.latitude]);
            const dx = qx - px;
            const dy = qy - py;
            const d2 = (dx * dx) + (dy * dy);
            if (d2 < bestD2) {
                bestD2 = d2;
                bestIdx = i;
            }
        }
        return bestIdx;
    }

    /**
     * Show the warning bar when the current pick maps to an earlier
     * route vertex than {@link _mustBeAfter} — meaning, along the
     * boat's travel direction, the user picked a position the boat had
     * not yet reached when the reference position was recorded. Soft
     * warning only; the save button remains active.
     * @protected
     */
    protected _updateOrderWarning(): void {
        if (!this._mustBeAfter
            || !this._route
            || this._route.length < 2
            || !this._value
            || this._value.latitude === undefined
            || this._value.longitude === undefined
            || this._mustBeAfter.latitude === undefined
            || this._mustBeAfter.longitude === undefined
        ) {
            this._orderWarning.hide().empty();
            return;
        }

        const beginIdx = this._nearestRouteIndex(this._mustBeAfter.latitude, this._mustBeAfter.longitude);
        const pickIdx = this._nearestRouteIndex(this._value.latitude, this._value.longitude);

        if (beginIdx === -1 || pickIdx === -1 || pickIdx > beginIdx) {
            this._orderWarning.hide().empty();
            return;
        }

        const lang = Lang.i();
        const msg = lang.l('Position end is before Position begin along the boat\'s travel direction.')
            ?? 'Position end is before Position begin along the boat\'s travel direction.';
        this._orderWarning
            .html(`<i class="fas fa-exclamation-triangle mr-1"></i>${escapeHtml(msg)}`)
            .show();
    }

    public override setReadOnly(readonly: boolean): void {
        super.setReadOnly(readonly);
        this._readOnlyContent = readonly;
        const inputs = [
            this._decLatInput, this._decLonInput,
            this._dmLatDir, this._dmLatDeg, this._dmLatMin,
            this._dmLonDir, this._dmLonDeg, this._dmLonMin
        ];
        for (const i of inputs) {
            i.prop('disabled', readonly);
        }
    }

}