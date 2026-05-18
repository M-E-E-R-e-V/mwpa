import {StatusCodes} from 'figtree-schemas';
import {ExternalTourSourceEntry, ExternalTourSourceListResponse} from 'mwpa_schemas';
import {OrganizationExternalTourSourceRepository} from '../../../Db/MariaDb/Repositories/OrganizationExternalTourSourceRepository.js';

/**
 * Admin-only list of every external tour-source config row.
 */
export class SourceList {

    public static async list(): Promise<ExternalTourSourceListResponse> {
        const repo = await OrganizationExternalTourSourceRepository.getInstance().getRepository();
        const rows = await repo.find();

        const list: ExternalTourSourceEntry[] = rows.map((row) => {
            let itemPks: string[] = [];
            try {
                const parsed = JSON.parse(row.item_pks || '[]');
                if (Array.isArray(parsed)) {
                    itemPks = parsed.map((v) => `${v}`);
                }
            } catch {
                /* fall through with empty list */
            }

            return {
                id: row.id,
                organization_id: row.organization_id,
                provider: row.provider,
                base_url: row.base_url,
                company_shortname: row.company_shortname,
                item_pks: itemPks,
                enabled: row.enabled,
                last_full_pull_at: row.last_full_pull_at,
                last_error: row.last_error ?? undefined
            };
        });

        return {
            statusCode: StatusCodes.OK,
            list
        };
    }

}