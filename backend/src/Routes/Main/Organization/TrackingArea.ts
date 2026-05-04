import {DefaultReturn, StatusCodes} from 'figtree-schemas';
import {Vts} from 'vts';
import {
    OrganizationTrackingAreaEntry,
    OrganizationTrackingAreaRequest,
    OrganizationTrackingAreaResponse
} from 'mwpa_schemas';
import {OrganizationTrackingArea as OrganizationTrackingAreaDB} from '../../../Db/MariaDb/Entities/OrganizationTrackingArea.js';
import {OrganizationTrackingAreaRepository} from '../../../Db/MariaDb/Repositories/OrganizationTrackingAreaRepository.js';

/**
 * TrackingArea
 */
export class TrackingArea {

    /**
     * Look up a tracking area either by its own id or by organization id + area type.
     * @param {OrganizationTrackingAreaRequest} request
     * @return {OrganizationTrackingAreaResponse}
     */
    public static async getTrackingArea(request?: OrganizationTrackingAreaRequest): Promise<OrganizationTrackingAreaResponse> {
        if (Vts.isUndefined(request)) {
            return {
                statusCode: StatusCodes.INTERNAL_ERROR,
                msg: 'Request incomplete'
            };
        }

        let ota: OrganizationTrackingAreaDB | null = null;

        if (request.id) {
            ota = await OrganizationTrackingAreaRepository.getInstance().findOne(request.id);
        } else if (request.organization) {
            ota = await OrganizationTrackingAreaRepository.getInstance().findByOrganizationAndType(
                request.organization.organization_id,
                request.organization.area_type
            );
        }

        if (ota) {
            return {
                statusCode: StatusCodes.OK,
                data: {
                    id: ota.id,
                    area_type: ota.area_type,
                    organization_id: ota.organization_id,
                    geojsonstr: ota.geojsonstr
                }
            };
        }

        return {
            statusCode: StatusCodes.OK
        };
    }

    /**
     * Insert or update a tracking area record. Caller must verify admin role.
     * @param {OrganizationTrackingAreaEntry} entry
     * @return {DefaultReturn}
     */
    public static async saveTrackingArea(entry?: OrganizationTrackingAreaEntry): Promise<DefaultReturn> {
        if (Vts.isUndefined(entry)) {
            return {
                statusCode: StatusCodes.INTERNAL_ERROR,
                msg: 'Request incomplete'
            };
        }

        let ota: OrganizationTrackingAreaDB | null = null;

        if (entry.id !== 0) {
            ota = await OrganizationTrackingAreaRepository.getInstance().findOne(entry.id);
        }

        const ctime = Math.floor(Date.now() / 1000);

        if (ota === null) {
            ota = new OrganizationTrackingAreaDB();
            ota.create_datetime = ctime;
        }

        if (ota.create_datetime === 0) {
            ota.create_datetime = ctime;
        }

        ota.update_datetime = ctime;
        ota.organization_id = entry.organization_id;
        ota.area_type = entry.area_type;
        ota.geojsonstr = entry.geojsonstr;

        await OrganizationTrackingAreaRepository.getInstance().save(ota);

        return {
            statusCode: StatusCodes.OK
        };
    }

}