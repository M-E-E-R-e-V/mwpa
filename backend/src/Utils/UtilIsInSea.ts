// @ts-ignore — package ships no types
import getMap from '@geo-maps/earth-seas-10m';
// @ts-ignore — package ships no types
import GeoJsonLookup from 'geojson-geometries-lookup';

/**
 * Helper for checking if a coordinate lies in the sea.
 *
 * The geo lookup is built once on first use and reused — building it on
 * every call (as the legacy implementation did) loads ~MB of GeoJSON each
 * time and is far too expensive for a per-sighting batch job.
 */
export class UtilIsInSea {

    /**
     * Cached lookup, built lazily.
     * @private
     */
    private static _lookup: any = null;

    /**
     * Build (once) and return the cached lookup.
     * @private
     */
    private static _getLookup(): any {
        if (UtilIsInSea._lookup === null) {
            UtilIsInSea._lookup = new GeoJsonLookup(getMap());
        }

        return UtilIsInSea._lookup;
    }

    /**
     * Is the coordinate in the sea?
     * @param {number} longitude
     * @param {number} latitude
     * @return {boolean}
     */
    public static isInSea(longitude: number, latitude: number): boolean {
        return UtilIsInSea._getLookup().hasContainers({
            type: 'Point',
            coordinates: [longitude, latitude]
        });
    }

}