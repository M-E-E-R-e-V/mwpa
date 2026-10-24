/* global JQuery */
import {ComponentType, Tooltip2, Widget2} from 'bambooo';
import moment from 'moment';
import {GeolocationCoordinates} from '../Types/GeolocationCoordinates';
import {UtilLocation} from '../Utils/UtilLocation';

export type LocationDisplayButtonClickFn = () => void;

export class LocationDisplay extends Widget2 {

    public constructor(element: ComponentType, value: string|GeolocationCoordinates, onClick?: LocationDisplayButtonClickFn) {
        super({
            element: jQuery<HTMLDListElement>('<dl class="row"></dl>')
        });

        this._element.appendTo(LocationDisplay._asParent(element));

        let gcValue: GeolocationCoordinates|null = null;

        if (typeof value === 'string') {
            gcValue = UtilLocation.strToGeolocationCoordinates(value);
        } else {
            gcValue = value as GeolocationCoordinates;
        }

        let latStr = '';
        let lonStr = '';

        if (gcValue?.latitude) {
            try {
                const lat = UtilLocation.ddToDm(gcValue.latitude, true);

                latStr = `${lat.direction}: ${lat.degree}º ${lat.minute.toFixed(3)}`;
            } catch (e) {
                console.log(e);
            }
        }

        if (gcValue?.longitude) {
            try {
                const lon = UtilLocation.ddToDm(gcValue.longitude, false);

                lonStr = `${lon.direction}: ${lon.degree}º ${lon.minute.toFixed(3)}`;
            } catch (e) {
                console.log(e);
            }
        }

        const iconDt = jQuery('<dt class="col-sm-1"><i class="fas fa-map-marker-alt mr-1"></i></dt>');
        iconDt.appendTo(this._element);

        const locationDd = jQuery(`<dd class="col-sm-5">${latStr}<br>${lonStr}</dd>`);
        locationDd.appendTo(this._element);

        if (gcValue) {
            let tooltipstr = `${latStr} - ${lonStr}<br>`;

            if (gcValue.timestamp) {
                const date = moment(gcValue.timestamp);
                tooltipstr += `Date: ${date.format('YYYY.MM.DD HH:mm:ss')}<br>`;
            }

            tooltipstr += `Latitude: ${gcValue.latitude!}<br>`;
            tooltipstr += `Longitude: ${gcValue.longitude!}<br>`;

            if (gcValue.speed) {
                tooltipstr += `Speed: ${gcValue.speed.toFixed(3)} m/s<br>`;
            }

            if (gcValue.altitude) {
                tooltipstr += `Altitude: ${gcValue.altitude.toFixed(1)} m<br>`;
            }

            if (gcValue.accuracy) {
                tooltipstr += `Accuracy: ${gcValue.accuracy.toFixed(1)} m<br>`;
            }

            this._element.attr('data-bs-toggle', 'tooltip');
            this._element.attr('data-bs-html', 'true');
            this._element.attr('data-bs-title', tooltipstr);

            // init tooltips
            Tooltip2.init();
        } else {
            this._element.attr('title', '');
        }

        if (onClick) {
            this._element.on('click', (event: any): void => {
                jQuery('[data-bs-toggle="tooltip"]').tooltip('hide');
                onClick();
                event.preventDefault();
            });

            this._element.css({
                cursor: 'pointer'
            });
        }
    }

    /**
     * Resolve a parent element (bambooo component, jQuery or selector) to a
     * jQuery handle the display can be appended to.
     * @param {ComponentType} element
     * @return {JQuery}
     * @protected
     */
    protected static _asParent(element: ComponentType): JQuery {
        const maybe = element as {getElement?: () => JQuery;} | null | undefined;

        if (maybe && typeof maybe.getElement === 'function') {
            return maybe.getElement();
        }

        return jQuery(element as JQuery.Selector);
    }

}