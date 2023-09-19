import moment from 'moment';
import {InputBottemBorderOnly2} from '../Bambooo/Content/Form/InputBottemBorderOnly2';
import {Tooltip} from '../Bambooo/Content/Tooltip/Tooltip';
import {GeolocationCoordinates} from '../Types/GeolocationCoordinates';
import {UtilLocation} from '../Utils/UtilLocation';

/**
 * A location input widget.
 */
export class LocationInput extends InputBottemBorderOnly2 {

    /**
     * Geoloction coordinates value
     * @member {GeolocationCoordinates|null}
     */
    protected _gcValue: GeolocationCoordinates|null = null;

    /**
     * Set the location value as a type or string.
     * @param {string|GeolocationCoordinates} value
     */
    public setValue(value: string|GeolocationCoordinates): void {
        if (typeof value === 'string') {
            try {
                this._gcValue = JSON.parse(value!);
            } catch (e) {
                console.log(e);
            }
        } else {
            this._gcValue = value as GeolocationCoordinates;
        }

        if (this._gcValue) {
            const lat = UtilLocation.ddToDm(this._gcValue.latitude!, true);
            const lon = UtilLocation.ddToDm(this._gcValue.longitude!, false);

            const latStr = `${lat.direction}: ${lat.degree}º ${lat.minute.toFixed(3)}`;
            const lonStr = `${lon.direction}: ${lon.degree}º ${lon.minute.toFixed(3)}`;

            super.setValue(`${latStr} - ${lonStr}`);

            let tooltipstr = `${latStr} - ${lonStr}<br>`;

            if (this._gcValue.timestamp) {
                const date = moment(this._gcValue.timestamp);
                tooltipstr += `Date: ${date.format('YYYY.MM.DD hh:mm:ss')}<br>`;
            }

            tooltipstr += `Latitude: ${this._gcValue.latitude!}<br>`;
            tooltipstr += `Longitude: ${this._gcValue.longitude!}<br>`;

            if (this._gcValue.speed) {
                tooltipstr += `Speed: ${this._gcValue.speed.toFixed(3)} m/s<br>`;
            }

            if (this._gcValue.altitude) {
                tooltipstr += `Altitude: ${this._gcValue.altitude.toFixed(1)} m<br>`;
            }

            if (this._gcValue.accuracy) {
                tooltipstr += `Accuracy: ${this._gcValue.accuracy.toFixed(1)} m<br>`;
            }

            this._element.attr('data-toggle', 'tooltip');
            this._element.attr('data-html', 'true');
            this._element.attr('data-original-title', tooltipstr);

            // init tooltips
            Tooltip.init();
        } else {
            super.setValue('-');
            this._element.attr('title', '');
        }
    }

    public getGcValue(asJsonStr: boolean = true): string|GeolocationCoordinates|null {
        if (asJsonStr) {
            return JSON.stringify(this._gcValue);
        }

        return this._gcValue;
    }

    public getValue(): string {
        return this.getGcValue(true) as string;
    }

}