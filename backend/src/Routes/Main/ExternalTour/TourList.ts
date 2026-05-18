import {StatusCodes} from 'figtree-schemas';
import {In} from 'typeorm';
import {ExternalTourCustomerType, ExternalTourEntry, ExternalTourListRequest, ExternalTourListResponse} from 'mwpa_schemas';
import {ExternalTourRepository} from '../../../Db/MariaDb/Repositories/ExternalTourRepository.js';
import {Users} from '../../../Users/Users.js';

const DEFAULT_FORWARD_WINDOW_DAYS = 60;

/**
 * Read-only list of pulled external_tour rows. Non-admins are
 * restricted to slots from their own organisations; admins see
 * everything. Defaults to the now → now+60d window the cron uses.
 */
export class TourList {

    public static async list(
        userId: number,
        isAdmin: boolean,
        req: ExternalTourListRequest
    ): Promise<ExternalTourListResponse> {
        const now = Math.floor(Date.now() / 1000);
        const fromUtc = req.from_utc ?? now;
        const toUtc = req.to_utc ?? (now + (DEFAULT_FORWARD_WINDOW_DAYS * 24 * 3600));

        const repo = await ExternalTourRepository.getInstance().getRepository();
        const orgIds = isAdmin ? undefined : await Users.getOrganizationIds(userId);

        let whereOrg: number | typeof In.prototype | null = null;
        if (!isAdmin) {
            if (!orgIds || orgIds.length === 0) {
                return {statusCode: StatusCodes.OK, list: []};
            }
            if (req.organization_id !== undefined && req.organization_id > 0) {
                if (!orgIds.includes(req.organization_id)) {
                    return {statusCode: StatusCodes.OK, list: []};
                }
                whereOrg = req.organization_id;
            } else {
                whereOrg = In(orgIds);
            }
        } else if (req.organization_id !== undefined && req.organization_id > 0) {
            whereOrg = req.organization_id;
        }

        const qb = repo.createQueryBuilder('t')
            .where('t.start_at_utc BETWEEN :from AND :to', {from: fromUtc, to: toUtc})
            .orderBy('t.start_at_utc', 'ASC');

        if (whereOrg !== null) {
            if (typeof whereOrg === 'number') {
                qb.andWhere('t.organization_id = :org', {org: whereOrg});
            } else {
                qb.andWhere({organization_id: whereOrg});
            }
        }

        const rows = await qb.getMany();
        const list: ExternalTourEntry[] = rows.map((row) => {
            let customerTypes: ExternalTourCustomerType[] = [];
            try {
                const parsed = JSON.parse(row.customer_types || '[]');
                if (Array.isArray(parsed)) {
                    customerTypes = parsed;
                }
            } catch {
                /* keep empty list */
            }

            return {
                id: row.id,
                organization_id: row.organization_id,
                source_id: row.source_id,
                provider: row.provider,
                external_id: row.external_id,
                item_pk: row.item_pk,
                item_name: row.item_name,
                start_at: row.start_at,
                start_at_utc: row.start_at_utc,
                end_at: row.end_at,
                duration_text: row.duration_text,
                meeting_lat: row.meeting_lat ?? undefined,
                meeting_lon: row.meeting_lon ?? undefined,
                meeting_name: row.meeting_name,
                capacity_bookable: row.capacity_bookable,
                capacity_reserved: row.capacity_reserved,
                is_bookable: row.is_bookable,
                is_sold_out: row.is_sold_out,
                customer_types: customerTypes,
                currency: row.currency,
                last_seen_at: row.last_seen_at,
                last_updated_at: row.last_updated_at
            };
        });

        return {statusCode: StatusCodes.OK, list};
    }

}