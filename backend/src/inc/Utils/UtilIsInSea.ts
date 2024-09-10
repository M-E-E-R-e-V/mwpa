// @ts-ignore
import getMap from '@geo-maps/earth-seas-10m';
// @ts-ignore
import GeoJsonLookup from 'geojson-geometries-lookup';

/**
 * Helper for check coordinates is in Sea
 */
export class UtilIsInSea {

    /**
     * Is in Sea
     * @param {number} longitude
     * @param {number} latitude
     * @returns {boolean}
     */
    public static isInSea(longitude: number, latitude: number): boolean {
        const map = getMap();
        const landLookup = new GeoJsonLookup(map);

        return landLookup.hasContainers({
            type: 'Point',
            coordinates: [longitude, latitude]
        });
    }

}