import {StatusCodes} from 'figtree-schemas';
import {In} from 'typeorm';
import {Vts} from 'vts';
import {SightingDetailsRequest, SightingDetailsResponse} from 'mwpa_schemas';
import {SightingDetailsBuilder} from '../../../Application/SightingDetails/SightingDetailsBuilder.js';
import {DevicesRepository} from '../../../Db/MariaDb/Repositories/DevicesRepository.js';
import {EarthquakeRepository} from '../../../Db/MariaDb/Repositories/EarthquakeRepository.js';
import {OrganizationRepository} from '../../../Db/MariaDb/Repositories/OrganizationRepository.js';
import {SightingEnrichmentRepository} from '../../../Db/MariaDb/Repositories/SightingEnrichmentRepository.js';
import {SightingExtendedRepository} from '../../../Db/MariaDb/Repositories/SightingExtendedRepository.js';
import {SightingFishingEffortRepository} from '../../../Db/MariaDb/Repositories/SightingFishingEffortRepository.js';
import {SightingFishingVesselRepository} from '../../../Db/MariaDb/Repositories/SightingFishingVesselRepository.js';
import {SightingMovementRepository} from '../../../Db/MariaDb/Repositories/SightingMovementRepository.js';
import {SightingRepository} from '../../../Db/MariaDb/Repositories/SightingRepository.js';
import {SightingSeismicRepository} from '../../../Db/MariaDb/Repositories/SightingSeismicRepository.js';
import {UserRepository} from '../../../Db/MariaDb/Repositories/UserRepository.js';
import {VehicleRepository} from '../../../Db/MariaDb/Repositories/VehicleRepository.js';
import {Users} from '../../../Users/Users.js';

/**
 * Details
 *
 * POST /json/sightings/details — the read-only "Computed" tab of the
 * sighting dialog: meta data and the values of the background services.
 * Non-admins only see sightings of their organisations (via the boat).
 */
export class Details {

    /**
     * Computed data of a sighting. Caller must verify the right
     * (sightings_read).
     * @param {number} userId
     * @param {boolean} isAdmin
     * @param {SightingDetailsRequest} request
     * @return {SightingDetailsResponse}
     */
    public static async getDetails(
        userId: number,
        isAdmin: boolean,
        request?: SightingDetailsRequest
    ): Promise<SightingDetailsResponse> {
        if (Vts.isUndefined(request)) {
            return {statusCode: StatusCodes.INTERNAL_ERROR, msg: 'Request incomplete', sections: []};
        }

        const sighting = await SightingRepository.getInstance().findOne(request.id);

        if (!sighting) {
            return {statusCode: StatusCodes.INTERNAL_ERROR, msg: 'Sighting not found!', sections: []};
        }

        const vehicle = await VehicleRepository.getInstance().findOne(sighting.vehicle_id);
        const organizationId = vehicle?.organization_id ?? sighting.organization_id;

        if (!isAdmin && !await Users.canAccessOrganization(userId, isAdmin, organizationId)) {
            return {statusCode: StatusCodes.FORBIDDEN, msg: 'No access to this sighting!', sections: []};
        }

        const [creator, device, organization, extended, enrichment, effort, vessels, movement, links] = await Promise.all([
            UserRepository.getInstance().findOne(sighting.creater_id),
            sighting.device_id > 0 ? DevicesRepository.getInstance().findOne(sighting.device_id) : Promise.resolve(null),
            organizationId > 0 ? OrganizationRepository.getInstance().findOne(organizationId) : Promise.resolve(null),
            SightingExtendedRepository.getInstance().findOneBySighting(sighting.id),
            SightingEnrichmentRepository.getInstance().findOneBySightingUnid(sighting.unid),
            SightingFishingEffortRepository.getInstance().findOneBySighting(sighting.id),
            SightingFishingVesselRepository.getInstance().findBySighting(sighting.id),
            SightingMovementRepository.getInstance().findOneBySighting(sighting.id),
            SightingSeismicRepository.getInstance().findBySighting(sighting.id)
        ]);

        const quakeIds = [...new Set(links.map((link) => link.earthquake_id))];
        const quakes = quakeIds.length > 0
            ? await (await EarthquakeRepository.getInstance().getRepository()).find({where: {id: In(quakeIds)}})
            : [];

        const sections = SightingDetailsBuilder.build({
            sighting: sighting,
            creatorName: creator ? creator.full_name.trim() || creator.username : '',
            deviceName: device ? device.description.trim() || device.identity : `#${sighting.device_id}`,
            organizationName: organization?.description ?? '',
            extended: extended,
            enrichment: enrichment,
            effort: effort,
            vessels: vessels,
            movement: movement,
            seismic: links.map((link) => ({link: link, quake: quakes.find((q) => q.id === link.earthquake_id) ?? null}))
        });

        return {statusCode: StatusCodes.OK, sections: sections};
    }

}