import {DefaultReturn, StatusCodes} from 'figtree-schemas';
import {Vts} from 'vts';
import {OrganizationFullEntry} from 'mwpa_schemas';
import {Organization as OrganizationDB} from '../../../Db/MariaDb/Entities/Organization.js';
import {OrganizationRepository} from '../../../Db/MariaDb/Repositories/OrganizationRepository.js';

/**
 * Save
 */
export class Save {

    /**
     * Insert or update an organization. Caller must verify admin role.
     * @param {OrganizationFullEntry} entry
     * @return {DefaultReturn}
     */
    public static async saveOrganization(entry?: OrganizationFullEntry): Promise<DefaultReturn> {
        if (Vts.isUndefined(entry)) {
            return {
                statusCode: StatusCodes.INTERNAL_ERROR,
                msg: 'Request incomplete'
            };
        }

        let org: OrganizationDB|null = null;

        if (entry.id !== 0) {
            org = await OrganizationRepository.getInstance().findOne(entry.id);
        }

        if (org === null) {
            org = new OrganizationDB();
        }

        org.description = entry.description;
        org.country = entry.country;
        org.location = entry.location;
        org.lat = entry.lat;
        org.lon = entry.lon;

        await OrganizationRepository.getInstance().save(org);

        return {
            statusCode: StatusCodes.OK
        };
    }

}