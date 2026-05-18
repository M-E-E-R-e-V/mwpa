import {DefaultReturn, StatusCodes} from 'figtree-schemas';
import {ExternalTourSourceEntry} from 'mwpa_schemas';
import {OrganizationExternalTourSourceRepository} from '../../../Db/MariaDb/Repositories/OrganizationExternalTourSourceRepository.js';

/**
 * Create / update one tour-source config. id=0 inserts, anything else
 * updates (and 404s when no such row).
 *
 * Provider-side fields (last_full_pull_at, last_error) are NOT written
 * from user input — the cron owns them. Anything the client sends in
 * those keys is discarded.
 */
export class SourceSave {

    public static async save(entry: ExternalTourSourceEntry): Promise<DefaultReturn> {
        const repo = await OrganizationExternalTourSourceRepository.getInstance().getRepository();
        const now = Math.floor(Date.now() / 1000);

        let row = entry.id > 0 ? await repo.findOne({where: {id: entry.id}}) : null;

        if (entry.id > 0 && !row) {
            return {statusCode: StatusCodes.NOT_FOUND};
        }

        if (!row) {
            row = repo.create({create_datetime: now});
        }

        row.organization_id = entry.organization_id;
        row.provider = (entry.provider || 'fareharbor').trim();
        row.base_url = (entry.base_url || '').trim().replace(/\/+$/u, '');
        row.company_shortname = (entry.company_shortname || '').trim();
        row.item_pks = JSON.stringify(entry.item_pks ?? []);
        row.enabled = entry.enabled;
        row.update_datetime = now;

        await repo.save(row);

        return {statusCode: StatusCodes.OK};
    }

}