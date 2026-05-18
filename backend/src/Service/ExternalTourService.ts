import {Logger, ServiceJobAbstract} from 'figtree';
import {OrganizationExternalTourSource} from '../Db/MariaDb/Entities/OrganizationExternalTourSource.js';
import {ExternalTourRepository, ExternalTourUpsertPatch} from '../Db/MariaDb/Repositories/ExternalTourRepository.js';
import {OrganizationExternalTourSourceRepository} from '../Db/MariaDb/Repositories/OrganizationExternalTourSourceRepository.js';
import {FareHarborProvider} from './ExternalTour/Providers/FareHarborProvider.js';
import {ExternalTourProvider, ExternalTourSlot, ExternalTourSourceConfig} from './ExternalTour/Types.js';

/**
 * Background job that pulls scheduled tour slots from external
 * booking providers (FareHarbor today) into the `external_tour`
 * table.
 *
 * Refresh policy:
 *  - Pull window per source: now → +PULL_WINDOW_DAYS (default 60).
 *  - Past slots are NEVER re-fetched. Once a slot's start time is
 *    older than REFRESH_GRACE_HOURS, its row freezes — it remains
 *    in the table as a historical record of how full the slot got
 *    before it ran.
 *  - The cron upserts (provider, external_id), so existing slots
 *    that are still in the window get their capacity / sold-out /
 *    pricing refreshed; new slots get inserted; vanished slots
 *    stay (with stale last_seen_at — the admin UI can flag them).
 *
 * Errors on one source don't abort the whole tick — each source is
 * try/catch'd and stamped with last_error so the admin sees what's
 * broken.
 */
export class ExternalTourService extends ServiceJobAbstract {

    public static readonly NAME = 'external-tour';

    /** How far into the future to pull slots. */
    private static readonly PULL_WINDOW_DAYS = 60;

    /**
     * How long after a slot has already started we still consider it
     * mutable on the provider side. 2 hours covers late-running
     * tours and the FareHarbor "you can still mark sold-out a few
     * minutes after start" window.
     */
    private static readonly REFRESH_GRACE_HOURS = 2;

    private readonly _providers: Map<string, ExternalTourProvider> = new Map();

    public constructor(providers?: ExternalTourProvider[]) {
        super(ExternalTourService.NAME, ['mariadb']);
        this._cron = '*/15 * * * *';

        const list = providers ?? [new FareHarborProvider()];
        for (const p of list) {
            this._providers.set(p.name, p);
        }
    }

    /**
     * Cron tick.
     * @protected
     */
    protected async _execute(): Promise<void> {
        const logger = Logger.getLogger();
        const sources = await OrganizationExternalTourSourceRepository.getInstance().findAllEnabled();

        if (sources.length === 0) {
            return;
        }

        const nowSec = Math.floor(Date.now() / 1000);
        const fromUtc = new Date(Date.now() - (ExternalTourService.REFRESH_GRACE_HOURS * 3600 * 1000));
        const toUtc = new Date(Date.now() + (ExternalTourService.PULL_WINDOW_DAYS * 24 * 3600 * 1000));

        logger.info(`ExternalTourService: refreshing ${sources.length} source(s) for window `
            + `[${fromUtc.toISOString()}, ${toUtc.toISOString()}]`);

        for (const source of sources) {
            // eslint-disable-next-line no-await-in-loop
            await this._refreshSource(source, fromUtc, toUtc, nowSec);
        }
    }

    private async _refreshSource(
        source: OrganizationExternalTourSource,
        fromUtc: Date,
        toUtc: Date,
        nowSec: number
    ): Promise<void> {
        const logger = Logger.getLogger();
        const provider = this._providers.get(source.provider);
        const sourceRepo = OrganizationExternalTourSourceRepository.getInstance();

        if (!provider) {
            const msg = `no provider registered for "${source.provider}"`;
            logger.warn(`ExternalTourService: source ${source.id} skipped — ${msg}`);
            await sourceRepo.stampPullResult(source.id, nowSec, msg);
            return;
        }

        let itemPks: string[] = [];
        try {
            const parsed = JSON.parse(source.item_pks || '[]');
            if (Array.isArray(parsed)) {
                itemPks = parsed.map((v) => `${v}`).filter((v) => v !== '');
            }
        } catch {
            // tolerate malformed config — empty array means "all items"
        }

        const config: ExternalTourSourceConfig = {
            base_url: source.base_url,
            company_shortname: source.company_shortname,
            item_pks: itemPks
        };

        let slots: ExternalTourSlot[];
        try {
            slots = await provider.fetchSchedule(config, fromUtc, toUtc);
        } catch (e) {
            const msg = (e as Error).message;
            logger.error(`ExternalTourService: source ${source.id} (${source.provider}) pull failed — ${msg}`);
            await sourceRepo.stampPullResult(source.id, nowSec, msg);
            return;
        }

        const tourRepo = ExternalTourRepository.getInstance();
        let upserted = 0;

        for (const slot of slots) {
            const patch: ExternalTourUpsertPatch = {
                item_pk: slot.item_pk,
                item_name: slot.item_name,
                start_at: slot.start_at,
                start_at_utc: slot.start_at_utc,
                end_at: slot.end_at,
                duration_text: slot.duration_text,
                meeting_lat: slot.meeting_lat,
                meeting_lon: slot.meeting_lon,
                meeting_name: slot.meeting_name,
                capacity_bookable: slot.capacity_bookable,
                capacity_reserved: slot.capacity_reserved,
                is_bookable: slot.is_bookable,
                is_sold_out: slot.is_sold_out,
                customer_types: JSON.stringify(slot.customer_types),
                currency: slot.currency,
                fh_modified_at: slot.fh_modified_at,
                raw: ExternalTourService._safeStringify(slot.raw)
            };

            try {
                // eslint-disable-next-line no-await-in-loop
                await tourRepo.upsertByExternalId(
                    provider.name,
                    slot.external_id,
                    source.organization_id,
                    source.id,
                    patch,
                    nowSec
                );
                upserted++;
            } catch (e) {
                logger.warn(`ExternalTourService: upsert failed for ${provider.name}/${slot.external_id} — ${(e as Error).message}`);
            }
        }

        logger.info(`ExternalTourService: source ${source.id} (${source.provider}/${source.company_shortname}) `
            + `upserted ${upserted}/${slots.length} slot(s)`);

        await sourceRepo.stampPullResult(source.id, nowSec, null);
    }

    private static _safeStringify(value: unknown): string | null {
        try {
            return JSON.stringify(value);
        } catch {
            return null;
        }
    }

}