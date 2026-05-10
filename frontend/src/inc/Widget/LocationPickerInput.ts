/* global JQuery */
import {Component, ComponentType, Tooltip} from 'bambooo';
import moment from 'moment';
import {GeolocationCoordinates} from '../Types/GeolocationCoordinates';
import {UtilLocation} from '../Utils/UtilLocation';

export type LocationPickerAccept = (newValue: GeolocationCoordinates | null) => void;
export type LocationPickerRequest = (current: GeolocationCoordinates | null, accept: LocationPickerAccept) => void;

const escapeHtml = (s: string): string => s
.replace(/&/gu, '&amp;')
.replace(/</gu, '&lt;')
.replace(/>/gu, '&gt;')
.replace(/"/gu, '&quot;');

/**
 * LocationPickerInput — wraps a read-only location display with an
 * "open picker" button. Behaves like a regular form field (setValue/getValue,
 * setReadOnly), but the value can only be edited via the picker that the
 * parent wires through `setOnRequestPicker`.
 */
export class LocationPickerInput extends Component<HTMLDivElement> {

    protected _gcValue: GeolocationCoordinates | null = null;

    protected _input: JQuery<HTMLInputElement>;

    protected _button: JQuery<HTMLButtonElement>;

    protected _onRequest: LocationPickerRequest | null = null;

    protected _readOnly: boolean = false;

    public constructor(parent: ComponentType, name?: string) {
        super();

        const tparent = this._getAnyElement(parent);
        const root = jQuery<HTMLDivElement>('<div class="input-group input-group-sm location-picker-input"/>').appendTo(tparent);
        this._element = root;

        this._input = jQuery<HTMLInputElement>('<input type="text" class="form-control form-control-sm" readonly/>').appendTo(root);
        if (name !== undefined) {
            this._input.attr('name', name);
        }

        const append = jQuery('<div class="input-group-append"/>').appendTo(root);
        this._button = jQuery<HTMLButtonElement>('<button class="btn btn-default" type="button" tabindex="-1"><i class="fa fa-map-marker-alt"/></button>').appendTo(append);

        this._button.on('click', () => {
            if (this._readOnly || !this._onRequest) {
                return;
            }
            this._onRequest(this._gcValue, (newValue) => {
                this._gcValue = newValue;
                this._render();
            });
        });

        this._render();
    }

    public setOnRequestPicker(cb: LocationPickerRequest): void {
        this._onRequest = cb;
    }

    public setValue(value: string | GeolocationCoordinates | null): void {
        if (value === null || value === '') {
            this._gcValue = null;
        } else if (typeof value === 'string') {
            try {
                this._gcValue = JSON.parse(value);
            } catch {
                this._gcValue = null;
            }
        } else {
            this._gcValue = value;
        }
        this._render();
    }

    /**
     * Return the value as JSON string (compatible with existing
     * SightingsEntry.location_begin which stores GeolocationCoordinates JSON).
     */
    public getValue(): string {
        return JSON.stringify(this._gcValue);
    }

    public getGcValue(): GeolocationCoordinates | null {
        return this._gcValue;
    }

    public setReadOnly(readonly: boolean): void {
        this._readOnly = readonly;
        this._button.prop('disabled', readonly);
    }

    /**
     * Repaint the readonly input + tooltip from the current GC value. Mirrors
     * the original LocationInput's display formatting so existing places that
     * read it back render the same string.
     */
    protected _render(): void {
        if (!this._gcValue || this._gcValue.latitude === undefined || this._gcValue.longitude === undefined) {
            this._input.val('-');
            this._input.removeAttr('data-toggle data-html data-original-title title');
            return;
        }

        const lat = UtilLocation.ddToDm(this._gcValue.latitude, true);
        const lon = UtilLocation.ddToDm(this._gcValue.longitude, false);
        const latStr = `${lat.direction}: ${lat.degree}º ${lat.minute.toFixed(3)}`;
        const lonStr = `${lon.direction}: ${lon.degree}º ${lon.minute.toFixed(3)}`;
        this._input.val(`${latStr} - ${lonStr}`);

        let tooltipstr = `${escapeHtml(latStr)} - ${escapeHtml(lonStr)}<br>`;
        if (this._gcValue.timestamp) {
            tooltipstr += `Date: ${moment(this._gcValue.timestamp).format('YYYY.MM.DD HH:mm:ss')}<br>`;
        }
        tooltipstr += `Latitude: ${this._gcValue.latitude}<br>`;
        tooltipstr += `Longitude: ${this._gcValue.longitude}<br>`;
        if (this._gcValue.speed) {
            tooltipstr += `Speed: ${this._gcValue.speed.toFixed(3)} m/s<br>`;
        }
        if (this._gcValue.altitude) {
            tooltipstr += `Altitude: ${this._gcValue.altitude.toFixed(1)} m<br>`;
        }
        if (this._gcValue.accuracy) {
            tooltipstr += `Accuracy: ${this._gcValue.accuracy.toFixed(1)} m<br>`;
        }

        this._input.attr('data-toggle', 'tooltip');
        this._input.attr('data-html', 'true');
        this._input.attr('data-original-title', tooltipstr);
        Tooltip.init();
    }

}