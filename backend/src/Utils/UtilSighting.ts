import * as bcrypt from 'bcrypt';
import {TypeSighting} from 'mwpa_schemas';

/**
 * UtilSighting
 */
export class UtilSighting {

    /**
     * Build a deterministic-ish hash for a mobile sighting so the server can
     * detect re-uploads of the same sighting (vehicle, date, start, duration, species).
     * The bcrypt salt makes it non-deterministic, so the original code uses it as
     * a content fingerprint stored alongside the sighting and matched via findOne(hash).
     * @param {TypeSighting} sighting
     * @return {string}
     */
    public static async createHash(sighting: TypeSighting): Promise<string> {
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

        return bcrypt.hash(hashStr, 10);
    }

}