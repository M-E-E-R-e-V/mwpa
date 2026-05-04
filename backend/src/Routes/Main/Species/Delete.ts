import {DefaultReturn, StatusCodes} from 'figtree-schemas';
import {Vts} from 'vts';
import {SpeciesDeleteRequest} from 'mwpa_schemas';
import {SightingRepository} from '../../../Db/MariaDb/Repositories/SightingRepository.js';
import {SpeciesRepository} from '../../../Db/MariaDb/Repositories/SpeciesRepository.js';

/**
 * Delete
 */
export class Delete {

    /**
     * Delete a species. Refuses if any sighting still references it (caller should merge first).
     * Caller must verify admin role.
     * @param {SpeciesDeleteRequest} request
     * @return {DefaultReturn}
     */
    public static async deleteSpecies(request?: SpeciesDeleteRequest): Promise<DefaultReturn> {
        if (Vts.isUndefined(request)) {
            return {
                statusCode: StatusCodes.INTERNAL_ERROR,
                msg: 'Request incomplete'
            };
        }

        const species = await SpeciesRepository.getInstance().findOne(request.id);

        if (!species) {
            return {
                statusCode: StatusCodes.INTERNAL_ERROR,
                msg: 'Specie not found in the database'
            };
        }

        const inUse = await SightingRepository.getInstance().countBySpecies(species.id);

        if (inUse > 0) {
            return {
                statusCode: StatusCodes.INTERNAL_ERROR,
                msg: 'Specie is in use by sightings, pls merge this specie to a other specie'
            };
        }

        await SpeciesRepository.getInstance().remove(species.id);

        return {
            statusCode: StatusCodes.OK
        };
    }

}