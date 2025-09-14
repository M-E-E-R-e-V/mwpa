import {SightingMobile} from '../../app/Mobile/Sightings';
import {Sighting} from '../../Db/MariaDb/Entities/Sighting.js';

/**
 * UtilTourFid
 */
export class UtilTourFid {

    /**
     * createSTourFId
     * @param sighting
     */
    static createSTourFId(sighting: Sighting): string {
        return `${sighting.vehicle_id}-${sighting.vehicle_driver_id}-${sighting.date}-${sighting.tour_start}`;
    }

    /**
     * createMSTourFid
     * @param sighting
     */
    static createMSTourFid(sighting: SightingMobile): string {
        return `${sighting.vehicle_id}-${sighting.vehicle_driver_id}-${sighting.date}-${sighting.tour_start}`;
    }

}