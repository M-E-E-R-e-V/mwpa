import * as bcrypt from 'bcrypt';
import {SightingMobile} from '../../app/Mobile/Sightings';
import {TypeSighting} from '../Types/TypeSighting';

/**
 * UtilSighting
 */
export class UtilSighting {

    /**
     * createMSHash
     * @param sighting
     */
    static async createMSHash(sighting: TypeSighting): Promise<string> {
        let hashStr = '';
        hashStr += `${sighting.vehicle_id}`;
        hashStr += `,${sighting.date}`;
        hashStr += `,${sighting.tour_start}`;
        hashStr += `,${sighting.duration_from}`;

        let species = '';

        if (sighting.species_id && sighting.species_id > 0) {
            species = `,${sighting.species_id}`;
        } else if (sighting.other && sighting.other.trim() !== '') {
            species = `,${sighting.other}`;
        } else if (sighting.note && sighting.note.trim() !== '') {
            species = `,${sighting.note}`;
        }

        hashStr += `,${species},`;

        const hash = await bcrypt.hash(hashStr, 10);

        return hash;
    }

}