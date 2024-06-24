import {Coordinate} from 'ol/coordinate';
import {GeolocationCoordinates} from '../Types/GeolocationCoordinates';

/**
 * UtilLocationDM
 */
export type UtilLocationDM = {
    direction: string;
    degree: number;
    minute: number;
};

/**
 * UtilLocation
 */
export class UtilLocation {

    /**
     * ddToDm
     * @param coord
     */
    public static ddToDm(coord: number, isLat: boolean): UtilLocationDM {
        let direction = '';

        if (isLat) {
            direction = coord >= 0 ? 'N' : 'S';
        } else {
            direction = coord >= 0 ? 'E' : 'W';
        }

        const coordInt = Math.trunc(coord);
        const degree = Math.abs(coordInt);
        const minute = (coord - coordInt) * 0.6;

        return {
            direction,
            degree,
            minute: Math.abs(minute)
        };
    }

    /**
     * Convert a string (json) to a Geoloaction coordinates
     * @param {string} str
     * @returns {GeolocationCoordinates|null}
     */
    public static strToGeolocationCoordinates(str: string): GeolocationCoordinates|null {
        let gcValue: GeolocationCoordinates|null = null;

        if (typeof str === 'string') {
            try {
                gcValue = JSON.parse(str!);
            } catch (e) {
                console.log(e);
                return null;
            }

            return gcValue as GeolocationCoordinates;
        }

        return null;
    }

    /**
     * Convert a Geolocation to OL Coordinates
     * @param {GeolocationCoordinates} geo
     * @returns {Coordinate}
     */
    public static geoLocationToOlCoordinates(geo: GeolocationCoordinates): Coordinate {
        return [geo.longitude, geo.latitude];
    }

}