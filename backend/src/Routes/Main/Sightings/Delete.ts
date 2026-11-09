import {DefaultReturn, StatusCodes} from 'figtree-schemas';
import {Vts} from 'vts';
import {SightingDeleteRequest} from 'mwpa_schemas';
import {HistoryDiff} from '../../../Application/History/HistoryDiff.js';
import {SightingHistory} from '../../../Application/History/SightingHistory.js';
import {HistoryRepository} from '../../../Db/MariaDb/Repositories/HistoryRepository.js';
import {SightingRepository} from '../../../Db/MariaDb/Repositories/SightingRepository.js';
import {SightingMovementService} from '../../../Service/Movement/SightingMovementService.js';

/**
 * Delete
 */
export class Delete {

    /**
     * Soft-delete a sighting by id and store the reason in deletedDescription.
     * Caller must verify admin role.
     * @param {number} userId who deletes (for the history)
     * @param {SightingDeleteRequest} request
     * @return {DefaultReturn}
     */
    public static async deleteSighting(userId: number, request?: SightingDeleteRequest): Promise<DefaultReturn> {
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

        const before = HistoryDiff.snapshot(sighting, SightingHistory.FIELDS);

        sighting.deleted = true;
        sighting.deletedDescription = request.description;

        await SightingRepository.getInstance().save(sighting);

        await HistoryRepository.getInstance().record(
            SightingHistory.TABLE,
            sighting.id,
            'delete',
            HistoryDiff.diff(before, HistoryDiff.snapshot(sighting, SightingHistory.FIELDS), SightingHistory.FIELDS),
            {changerId: userId, source: 'web'}
        );

        // Drop the derived movement row + segments so the map stops
        // showing tracks for a sighting that no longer exists. The
        // service handles its own errors and detects the `deleted=true`
        // state internally.
        await SightingMovementService.getInstance().rebuildForSighting(sighting.id);

        return {
            statusCode: StatusCodes.OK
        };
    }

}