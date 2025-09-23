import {DBRepository} from 'figtree';
import {Organization} from '../Entities/Organization.js';

/**
 * Organization repository
 */
export class OrganizationRepository extends DBRepository<Organization> {

    /**
     * register name
     */
    public static REGISTER_NAME = 'organization';

    /**
     * Retrun a instance
     * @return {OrganizationRepository}
     */
    public static getInstance(): OrganizationRepository {
        return super.getSingleInstance(Organization);
    }

}