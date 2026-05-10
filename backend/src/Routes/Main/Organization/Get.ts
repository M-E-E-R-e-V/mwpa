import {StatusCodes} from 'figtree-schemas';
import {Vts} from 'vts';
import {OrganizationGetRequest, OrganizationResponse} from 'mwpa_schemas';
import {OrganizationRepository} from '../../../Db/MariaDb/Repositories/OrganizationRepository.js';

/**
 * Get
 */
export class Get {

    /**
     * Return one organization by id.
     * @param {OrganizationGetRequest} request
     * @return {OrganizationResponse}
     */
    public static async getOrganization(request?: OrganizationGetRequest): Promise<OrganizationResponse> {
        if (Vts.isUndefined(request)) {
            return {
                statusCode: StatusCodes.INTERNAL_ERROR,
                msg: 'Request incomplete'
            };
        }

        const org = await OrganizationRepository.getInstance().findOne(request.id);

        if (org) {
            return {
                statusCode: StatusCodes.OK,
                data: {
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
                    aroc_year: org.aroc_year,
                    aroc_authorized_boats: org.aroc_authorized_boats
                }
            };
        }

        return {
            statusCode: StatusCodes.INTERNAL_ERROR,
            msg: 'Organization not found!'
        };
    }

}