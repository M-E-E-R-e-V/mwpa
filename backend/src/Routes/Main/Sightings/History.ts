import {StatusCodes} from 'figtree-schemas';
import {In} from 'typeorm';
import {Vts} from 'vts';
import {SightingHistoryEntry, SightingHistoryRequest, SightingHistoryResponse} from 'mwpa_schemas';
import {SightingHistory} from '../../../Application/History/SightingHistory.js';
import {HistoryRepository} from '../../../Db/MariaDb/Repositories/HistoryRepository.js';
import {SightingRepository} from '../../../Db/MariaDb/Repositories/SightingRepository.js';
import {UserRepository} from '../../../Db/MariaDb/Repositories/UserRepository.js';
import {VehicleRepository} from '../../../Db/MariaDb/Repositories/VehicleRepository.js';
import {Users} from '../../../Users/Users.js';

/**
 * History
 *
 * POST /json/sightings/history — who changed what and when on a sighting,
 * newest first. Non-admins only see sightings of their organisations (via
 * the boat, like the save).
 */
export class History {

    /**
     * Change history of a sighting. Caller must verify the right
     * (sightings_read).
     * @param {number} userId
     * @param {boolean} isAdmin
     * @param {SightingHistoryRequest} request
     * @return {SightingHistoryResponse}
     */
    public static async getHistory(
        userId: number,
        isAdmin: boolean,
        request?: SightingHistoryRequest
    ): Promise<SightingHistoryResponse> {
        if (Vts.isUndefined(request)) {
            return {statusCode: StatusCodes.INTERNAL_ERROR, msg: 'Request incomplete', list: []};
        }

        const sighting = await SightingRepository.getInstance().findOne(request.id);

        if (!sighting) {
            return {statusCode: StatusCodes.INTERNAL_ERROR, msg: 'Sighting not found!', list: []};
        }

        if (!isAdmin) {
            const vehicle = await VehicleRepository.getInstance().findOne(sighting.vehicle_id);

            if (!await Users.canAccessOrganization(userId, isAdmin, vehicle?.organization_id ?? 0)) {
                return {statusCode: StatusCodes.FORBIDDEN, msg: 'No access to this sighting!', list: []};
            }
        }

        const rows = await HistoryRepository.getInstance().findByRow(SightingHistory.TABLE, sighting.id);
        const changerIds = [...new Set(rows.map((row) => row.changer_id).filter((id) => id > 0))];
        const names = new Map<number, string>();

        if (changerIds.length > 0) {
            const users = await (await UserRepository.getInstance().getRepository()).find({
                where: {id: In(changerIds)}
            });

            for (const user of users) {
                names.set(user.id, user.full_name.trim() === '' ? user.username : user.full_name);
            }
        }

        const list: SightingHistoryEntry[] = rows.map((row) => ({
            id: row.id,
            change_group: row.change_group,
            action: row.action,
            field: row.field,
            old_value: row.old_value ?? '',
            new_value: row.new_value ?? '',
            changer_id: row.changer_id,
            changer_name: names.get(row.changer_id) ?? '',
            change_time: row.change_time,
            source: row.source
        }));

        return {statusCode: StatusCodes.OK, list: list};
    }

}