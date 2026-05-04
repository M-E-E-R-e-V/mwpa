import {TypeSighting} from 'mwpa_schemas';

/**
 * UtilTourFid
 */
export class UtilTourFid {

    /**
     * Build a tour foreign id from sighting fields. Used by mobile sync to
     * group multiple sightings into the same tour without creating duplicates.
     * @param {TypeSighting} sighting
     * @return {string}
     */
    public static createTourFid(sighting: TypeSighting): string {
        return `${sighting.vehicle_id}-${sighting.vehicle_driver_id}-${sighting.date}-${sighting.tour_start}`;
    }

}