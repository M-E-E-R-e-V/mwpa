/* global JQuery */
import {ComponentType, LangText, ModalDialog, ModalDialogType} from 'bambooo';
import {fromLonLat} from 'ol/proj';
import {Lang} from '../Lang';
import {GeolocationCoordinates} from '../Types/GeolocationCoordinates';
import {SightingMap, SightingMapObjectType} from './SightingMap';

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

    protected _route: number[][] | null = null;

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

    protected _useGpsBtn: JQuery<HTMLButtonElement>;

    protected _mapContainer: JQuery<HTMLDivElement>;

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

        // GPS button.
        this._useGpsBtn = jQuery<HTMLButtonElement>(`<button type="button" class="btn btn-default btn-sm mt-3"><i class="fa fa-crosshairs"></i> ${escapeHtml(lang.l('Use current GPS'))}</button>`).appendTo(colLeft);

        /*
         * Map container — SightingMap is mounted lazily on first show() so its
         * OpenLayers init doesn't run when the modal is hidden (size=0 → broken render).
         */
        this._mapContainer = jQuery<HTMLDivElement>('<div class="location-picker-map"/>').appendTo(colRight);

        // Footer buttons.
        this.addButtonClose(new LangText('Close'));
        this.addButtonSave(new LangText('Use this position'));

        this._wireInputs();
        this._wireGps();

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
    public open(initial: GeolocationCoordinates | null, route: number[][] | null, onPicked: LocationPickerCallback): void {
        this._value = initial ? {...initial} : null;
        this._route = route;
        this._onPicked = onPicked;

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
    public setRoute(route: number[][]|null): void {
        this._route = route;
        if (this._mapInitialised) {
            this._renderMapState();
        }
    }

    public override resetValues(): void {
        this._value = null;
        this._route = null;
        this._onPicked = null;
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
    }

    protected _wireInputs(): void {
        const decHandler = (): void => {
            if (this._suspendSync) {
                return;
            }
            const lat = parseNum(this._decLatInput.val() as string);
            const lon = parseNum(this._decLonInput.val() as string);
            this._setValue({latitude: lat, longitude: lon, timestamp: Date.now()});
            this._suspendSync = true;
            this._fillDmFromValue();
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
            this._fillDecFromValue();
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

    protected _wireGps(): void {
        this._useGpsBtn.on('click', () => {
            if (!navigator.geolocation) {
                return;
            }
            navigator.geolocation.getCurrentPosition((pos) => {
                const v: GeolocationCoordinates = {
                    latitude: pos.coords.latitude,
                    longitude: pos.coords.longitude,
                    accuracy: pos.coords.accuracy,
                    altitude: pos.coords.altitude ?? undefined,
                    speed: pos.coords.speed ?? undefined,
                    heading: pos.coords.heading ?? undefined,
                    timestamp: pos.timestamp
                };
                this._setValue(v);
                this._suspendSync = true;
                this._fillFromValue();
                this._suspendSync = false;
                this._renderMapState();
            }, (err) => {
                console.warn('GPS error:', err);
            });
        });
    }

    protected _setValue(v: GeolocationCoordinates): void {
        this._value = v;
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
    }

    protected _renderMapState(): void {
        if (!this._map) {
            return;
        }

        this._map.clearFeatureList();

        if (this._route && this._route.length > 1) {
            this._map.addLineRoute(this._route);
        }

        let center: number[] | null = null;
        if (this._value && this._value.latitude !== undefined && this._value.longitude !== undefined) {
            this._map.addSighting(
                SightingMapObjectType.Testudines,
                'picker-marker',
                'Picked position',
                [this._value.longitude, this._value.latitude]
            );
            center = [this._value.longitude, this._value.latitude];
        } else if (this._route && this._route.length > 0) {
            center = this._route[0];
        }

        if (center) {
            this._map.setView(fromLonLat(center));
        }

        this._map.refrech().catch(() => undefined);
        this._map.updateSize();
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
        this._useGpsBtn.prop('disabled', readonly);
    }

}