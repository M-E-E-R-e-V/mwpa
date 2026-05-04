import {DBRepository} from 'figtree';
import {OrganizationTrackingArea} from '../Entities/OrganizationTrackingArea.js';

/**
 * OrganizationTrackingArea repository
 */
export class OrganizationTrackingAreaRepository extends DBRepository<OrganizationTrackingArea> {

    /**
     * register name
     */
    public static REGISTER_NAME = 'organization_tracking_area';

    /**
     * Retrun a instance
     * @return {OrganizationTrackingAreaRepository}
     */
    public static getInstance(): OrganizationTrackingAreaRepository {
        return super.getSingleInstance(OrganizationTrackingArea);
    }

    /**
     * Find a tracking area by organization id and area type
     * @param {number} organizationId
     * @param {string} areaType
     * @return {OrganizationTrackingArea | null}
     */
    public async findByOrganizationAndType(organizationId: number, areaType: string): Promise<OrganizationTrackingArea | null> {
        const repository = await this._repository;
        return repository.findOne({
            where: {
                organization_id: organizationId,
                area_type: areaType
            }
        });
    }

}