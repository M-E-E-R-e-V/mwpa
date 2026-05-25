import {StatusCodes} from 'figtree-schemas';
import {OrphanTrackEntry, OrphanTracksFilter, OrphanTracksListResponse} from 'mwpa_schemas';
import {SightingTourTrackingPendingRepository} from '../../../Db/MariaDb/Repositories/SightingTourTrackingPendingRepository.js';
import {Users} from '../../../Users/Users.js';
import {UtilTourFid} from '../../../Utils/UtilTourFid.js';

/**
 * List
 */
export class List {

    /**
     * Paginated orphan-bucket list. Non-admins see only buckets whose owning
     * device belongs to a user in one of their organisations; admins see
     * everything. The tour_fid is parsed back into its components so the
     * frontend table can show vehicle/driver/date/start without re-doing
     * the regex.
     * @param {number} userId
     * @param {boolean} isAdmin
     * @param {OrphanTracksFilter} filter
     * @return {OrphanTracksListResponse}
     */
    public static async getList(
        userId: number,
        isAdmin: boolean,
        filter?: OrphanTracksFilter
    ): Promise<OrphanTracksListResponse> {
        const orgIds = isAdmin ? undefined : await Users.getOrganizationIds(userId);

        const {rows, count} = await SightingTourTrackingPendingRepository.getInstance().findDistinctOrphans(
            {
                period_from: filter?.period_from,
                period_to: filter?.period_to,
                device_id: filter?.device_id
            },
            orgIds,
            filter?.offset,
            filter?.limit
        );

        const list: OrphanTrackEntry[] = rows.map((b) => {
            const parsed = UtilTourFid.parseTourFid(b.tour_fid);
            return {
                tour_fid: b.tour_fid,
                device_id: b.device_id,
                vehicle_id: parsed?.vehicle_id ?? 0,
                vehicle_driver_id: parsed?.vehicle_driver_id ?? 0,
                date: parsed?.date ?? '',
                tour_start: parsed?.tour_start ?? '',
                count: b.count,
                min_create_datetime: b.min_create_datetime,
                max_create_datetime: b.max_create_datetime
            };
        });

        return {
            statusCode: StatusCodes.OK,
            filter,
            count,
            offset: filter?.offset ?? 0,
            list
        };
    }

}