import {DBRepository} from 'figtree';
import {Between, In, MoreThanOrEqual} from 'typeorm';
import {ExternalTour} from '../Entities/ExternalTour.js';

/**
 * The set of provider-pulled fields that gets overwritten on every
 * upsert. Identity fields (provider, external_id, organization_id,
 * source_id) and the `create_datetime` stamp are NOT in here — they
 * stay stable across refreshes.
 */
export type ExternalTourUpsertPatch = {
    item_pk: string;
    item_name: string;
    start_at: number;
    start_at_utc: number;
    end_at: number;
    duration_text: string;
    meeting_lat: number | null;
    meeting_lon: number | null;
    meeting_name: string;
    capacity_bookable: number;
    capacity_reserved: number;
    is_bookable: boolean;
    is_sold_out: boolean;
    customer_types: string;
    currency: string;
    fh_modified_at: number;
    raw: string | null;
};

/**
 * ExternalTour repository.
 *
 * Identity is (provider, external_id) — `upsertByExternalId` is the
 * one mutation entry-point the cron service needs. Reads expose the
 * two access patterns the UI cares about: list-by-organization and
 * "what's still mutable" for cron windowing.
 */
export class ExternalTourRepository extends DBRepository<ExternalTour> {

    public static REGISTER_NAME = 'external_tour';

    public static getInstance(): ExternalTourRepository {
        return super.getSingleInstance(ExternalTour);
    }

    /**
     * Insert or update a slot keyed on (provider, external_id).
     * Always advances `last_seen_at` and `last_updated_at` to the
     * given timestamp — even when no payload field changed, those two
     * track "we asked the provider and the slot is still there".
     */
    public async upsertByExternalId(
        provider: string,
        externalId: string,
        organizationId: number,
        sourceId: number,
        patch: ExternalTourUpsertPatch,
        nowUnixSec: number
    ): Promise<ExternalTour> {
        const repo = await this._repository;
        let row = await repo.findOne({where: {provider, external_id: externalId}});

        if (!row) {
            row = repo.create({
                provider,
                external_id: externalId,
                organization_id: organizationId,
                source_id: sourceId,
                create_datetime: nowUnixSec
            });
        }

        row.item_pk = patch.item_pk;
        row.item_name = patch.item_name;
        row.start_at = patch.start_at;
        row.start_at_utc = patch.start_at_utc;
        row.end_at = patch.end_at;
        row.duration_text = patch.duration_text;
        row.meeting_lat = patch.meeting_lat;
        row.meeting_lon = patch.meeting_lon;
        row.meeting_name = patch.meeting_name;
        row.capacity_bookable = patch.capacity_bookable;
        row.capacity_reserved = patch.capacity_reserved;
        row.is_bookable = patch.is_bookable;
        row.is_sold_out = patch.is_sold_out;
        row.customer_types = patch.customer_types;
        row.currency = patch.currency;
        row.fh_modified_at = patch.fh_modified_at;
        row.raw = patch.raw;
        row.last_seen_at = nowUnixSec;
        row.last_updated_at = nowUnixSec;

        return repo.save(row);
    }

    /**
     * Slots for an organization within the given UTC window. Used
     * both by the admin UI and by the cron to know which existing
     * rows to refresh (vs leave alone).
     */
    public async findByOrgInRange(
        organizationId: number,
        fromUtcSec: number,
        toUtcSec: number
    ): Promise<ExternalTour[]> {
        const repo = await this._repository;
        return repo.find({
            where: {
                organization_id: organizationId,
                start_at_utc: Between(fromUtcSec, toUtcSec)
            },
            order: {start_at_utc: 'ASC'}
        });
    }

    /**
     * Slots whose start time is still in the future or recent past
     * (defined by `cutoffUtcSec`). The cron uses this to know which
     * rows are still mutable on the provider side — once a slot is
     * comfortably past, we freeze it.
     */
    public async findRefreshable(
        sourceIds: number[],
        cutoffUtcSec: number
    ): Promise<ExternalTour[]> {
        if (sourceIds.length === 0) {
            return [];
        }
        const repo = await this._repository;
        return repo.find({
            where: {
                source_id: In(sourceIds),
                start_at_utc: MoreThanOrEqual(cutoffUtcSec)
            }
        });
    }

}