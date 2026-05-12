import {StatusCodes} from 'figtree-schemas';
import {OrganizationFullEntry, OrganizationListResponse} from 'mwpa_schemas';
import {OrganizationRepository} from '../../../Db/MariaDb/Repositories/OrganizationRepository.js';

/**
 * List
 */
export class List {

    /**
     * Return all organizations with full address info.
     * @return {OrganizationListResponse}
     */
    public static async getList(): Promise<OrganizationListResponse> {
        const orgs = await OrganizationRepository.getInstance().findAll();

        const list: OrganizationFullEntry[] = [];

        for (const org of orgs) {
            list.push({
                id: org.id,
                description: org.description,
                location: org.location,
                lat: org.lat,
                lon: org.lon,
                country: org.country,
                province: org.province,
                island: org.island,
                port: org.port,
                email: org.email,
                web: org.web,
                aroc_reference: org.aroc_reference,
                aroc_region: org.aroc_region,
                aroc_number: org.aroc_number,
                aroc_authorized_boats: org.aroc_authorized_boats
            });
        }

        return {
            statusCode: StatusCodes.OK,
            list
        };
    }

}