import {DBRepository} from 'figtree';
import {OrganizationExternalTourSource} from '../Entities/OrganizationExternalTourSource.js';

/**
 * OrganizationExternalTourSource repository.
 *
 * Tiny CRUD wrapper — the table is admin-only and rarely touched
 * (one row per (org, provider, company) configuration), so the cron
 * never burns budget reading it more than once per tick.
 */
export class OrganizationExternalTourSourceRepository extends DBRepository<OrganizationExternalTourSource> {

    public static REGISTER_NAME = 'organization_external_tour_source';

    public static getInstance(): OrganizationExternalTourSourceRepository {
        return super.getSingleInstance(OrganizationExternalTourSource);
    }

    /**
     * All enabled sources, used by the cron at every tick.
     */
    public async findAllEnabled(): Promise<OrganizationExternalTourSource[]> {
        const repo = await this._repository;
        return repo.find({where: {enabled: true}});
    }

    /**
     * All sources (enabled or not) for an organization — admin UI.
     */
    public async findByOrganization(organizationId: number): Promise<OrganizationExternalTourSource[]> {
        const repo = await this._repository;
        return repo.find({where: {organization_id: organizationId}});
    }

    /**
     * Stamp the last-pull marker + clear/set the error message in a
     * single save. Used by ExternalTourService to keep the admin UI's
     * staleness/error indicators truthful without an extra round-trip
     * per source.
     */
    public async stampPullResult(
        sourceId: number,
        atUnixSec: number,
        error: string | null
    ): Promise<void> {
        const repo = await this._repository;
        const source = await repo.findOne({where: {id: sourceId}});
        if (!source) {
            return;
        }
        source.last_full_pull_at = atUnixSec;
        source.last_error = error;
        source.update_datetime = atUnixSec;
        await repo.save(source);
    }

}