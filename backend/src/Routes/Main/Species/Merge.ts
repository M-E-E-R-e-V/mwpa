import {DefaultReturn, StatusCodes} from 'figtree-schemas';
import {Vts} from 'vts';
import {SpeciesMergeRequest} from 'mwpa_schemas';
import {SightingRepository} from '../../../Db/MariaDb/Repositories/SightingRepository.js';
import {SpeciesRepository} from '../../../Db/MariaDb/Repositories/SpeciesRepository.js';

/**
 * Merge
 */
export class Merge {

    /**
     * Reassign all sightings of source_id to destination_id, then delete source.
     * Caller must verify admin role.
     * @param {SpeciesMergeRequest} request
     * @return {DefaultReturn}
     */
    public static async mergeSpecies(request?: SpeciesMergeRequest): Promise<DefaultReturn> {
        if (Vts.isUndefined(request)) {
            return {
                statusCode: StatusCodes.INTERNAL_ERROR,
                msg: 'Request incomplete'
            };
        }

        const source = await SpeciesRepository.getInstance().findOne(request.source_id);

        if (!source) {
            return {
                statusCode: StatusCodes.INTERNAL_ERROR,
                msg: 'Source specie not found in the database'
            };
        }

        const destination = await SpeciesRepository.getInstance().findOne(request.destination_id);

        if (!destination) {
            return {
                statusCode: StatusCodes.INTERNAL_ERROR,
                msg: 'Destination specie not found in the database'
            };
        }

        await SightingRepository.getInstance().reassignSpecies(source.id, destination.id);
        await SpeciesRepository.getInstance().remove(source.id);

        return {
            statusCode: StatusCodes.OK
        };
    }

}