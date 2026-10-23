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

        const baseUrl = SourceSave._sanitizeBaseUrl(entry.base_url);
        if (baseUrl === null) {
            return {
                statusCode: StatusCodes.INTERNAL_ERROR,
                msg: 'Invalid base_url — must be http(s) and not a private/loopback/link-local host.'
            };
        }

        row.organization_id = entry.organization_id;
        row.provider = (entry.provider || 'fareharbor').trim();
        row.base_url = baseUrl;
        row.company_shortname = (entry.company_shortname || '').trim();
        row.item_pks = JSON.stringify(entry.item_pks ?? []);
        row.enabled = entry.enabled;
        row.update_datetime = now;

        await repo.save(row);

        return {statusCode: StatusCodes.OK};
    }

    /**
     * Validate + normalise the provider base URL before it is persisted and
     * later fetched server-side by the pull cron. Blocks stored SSRF: only
     * http(s) is allowed, and obvious internal targets (loopback, RFC-1918,
     * link-local incl. the 169.254.169.254 cloud-metadata endpoint, IPv6
     * loopback) are rejected. Empty stays empty (a disabled/unconfigured
     * source). Returns null when the value is unusable.
     *
     * Note: this checks the literal host only; a hostname that resolves to a
     * private IP (DNS rebinding) is out of scope here — mitigate with an egress
     * allow-list at the network layer if that threat matters.
     * @param {string | undefined} raw
     * @return {string | null}
     * @private
     */
    private static _sanitizeBaseUrl(raw: string | undefined): string | null {
        const trimmed = (raw || '').trim().replace(/\/+$/u, '');

        if (trimmed === '') {
            return '';
        }

        let url: URL;
        try {
            url = new URL(trimmed);
        } catch {
            return null;
        }

        if (url.protocol !== 'http:' && url.protocol !== 'https:') {
            return null;
        }

        const host = url.hostname.toLowerCase();
        const blocked =
            host === 'localhost' || host.endsWith('.localhost') ||
            host === '0.0.0.0' || host === '::1' || host === '[::1]' ||
            host === '169.254.169.254' ||
            (/^127\./u).test(host) ||
            (/^10\./u).test(host) ||
            (/^192\.168\./u).test(host) ||
            (/^169\.254\./u).test(host) ||
            (/^172\.(1[6-9]|2\d|3[01])\./u).test(host);

        if (blocked) {
            return null;
        }

        return trimmed;
    }

}