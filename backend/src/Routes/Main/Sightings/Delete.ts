import {DefaultReturn, StatusCodes} from 'figtree-schemas';
import {Vts} from 'vts';
import {SightingDeleteRequest} from 'mwpa_schemas';
import {SightingRepository} from '../../../Db/MariaDb/Repositories/SightingRepository.js';

/**
 * Delete
 */
export class Delete {

    /**
     * Soft-delete a sighting by id and store the reason in deletedDescription.
     * Caller must verify admin role.
     * @param {SightingDeleteRequest} request
     * @return {DefaultReturn}
     */
    public static async deleteSighting(request?: SightingDeleteRequest): Promise<DefaultReturn> {
        if (Vts.isUndefined(request)) {
            return {
                statusCode: StatusCodes.INTERNAL_ERROR,
                msg: 'Request incomplete'
            };
        }

        const sighting = await SightingRepository.getInstance().findOne(request.id);

        if (!sighting) {
            return {
                statusCode: StatusCodes.INTERNAL_ERROR,
                msg: 'Sighting not found!'
            };
        }

        sighting.deleted = true;
        sighting.deletedDescription = request.description;

        await SightingRepository.getInstance().save(sighting);

        return {
            statusCode: StatusCodes.OK
        };
    }

}