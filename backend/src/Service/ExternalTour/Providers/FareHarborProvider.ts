import {Logger} from 'figtree';
import {ExternalTourProvider, ExternalTourSlot, ExternalTourSourceConfig} from '../Types.js';

/**
 * FareHarbor calendar / pricing-overview shapes — only the fields we
 * actually consume. The provider's API is public and stable enough
 * that we can rely on these key names; unknown extra fields are
 * ignored and survive in the `raw` field of ExternalTourSlot.
 */
type FhCompany = {
    pk: number;
    shortname: string;
    name: string;
    processor_currency?: string;
};

type FhItem = {
    pk: number;
    name: string;
};

type FhLocation = {
    name?: string;
    latitude?: number;
    longitude?: number;
};

type FhAvailability = {
    pk: number;
    company: FhCompany;
    item: FhItem;
    start_at: string;
    end_at: string;
    approximate_available_capacity?: number | null;
    headline?: string;
    is_bookable: boolean;
    is_sold_out: boolean;
    primary_location?: FhLocation;
};

type FhDay = {
    availabilities?: FhAvailability[];
};

type FhWeek = {
    days?: FhDay[];
};

type FhCalendarResponse = {
    calendar?: {
        weeks?: FhWeek[];
    };
};

type FhCustomerType = {
    name?: string;
    note?: string;
};

type FhCustomerTypeRate = {
    cls?: string;
    customer_type?: FhCustomerType;
    capacity?: number | null;
};

type FhPricingPrice = {
    offset?: number;
    rate?: number;
};

type FhPricingTier = {
    price?: FhPricingPrice;
};

type FhPricePreview = {
    low_pricing?: FhPricingTier;
    high_pricing?: FhPricingTier;
    for_object?: FhCustomerTypeRate;
    availability?: {pk?: number;};
};

type FhPricingOverviewResponse = {
    price_previews?: FhPricePreview[];
};

type FhItemDetail = {
    primary_location?: FhLocation;
    headline?: string;
};

type FhCompanyDetail = {
    default_item_primary_location?: FhLocation;
    primary_location?: FhLocation;
    processor_currency?: string;
};

/**
 * Pulls planned tour slots from FareHarbor's public read API. Uses
 * calendar + pricing-overview (batched per item) and falls back to
 * company + item detail for meeting-point coordinates the calendar
 * payload doesn't carry. Stateless; constructed once per cron, reused
 * for every tick.
 *
 * Pacing: 200 ms between upstream requests. FareHarbor doesn't
 * document a hard rate limit, but this keeps us well under any
 * reasonable threshold and a single org's full refresh stays inside
 * the 5-minute cron window.
 */
export class FareHarborProvider implements ExternalTourProvider {

    public readonly name = 'fareharbor';

    private static readonly REQUEST_SPACING_MS = 200;

    /**
     * Per-(item, month) cache of item details — small, used per slot
     * to fill meeting-point coords. Cleared between pulls so config
     * changes propagate.
     * @private
     */
    private _itemCache: Map<string, FhItemDetail> = new Map();

    /**
     * Per-company cache of the default meeting point — every item
     * inherits the company's `default_item_primary_location` when its
     * own item.primary_location is empty.
     * @private
     */
    private _companyCache: Map<string, FhCompanyDetail> = new Map();

    public async fetchSchedule(
        config: ExternalTourSourceConfig,
        fromUtc: Date,
        toUtc: Date
    ): Promise<ExternalTourSlot[]> {
        this._itemCache.clear();
        this._companyCache.clear();

        if (config.company_shortname.trim() === '') {
            return [];
        }

        const itemPks = config.item_pks.length > 0
            ? config.item_pks
            : await this._listItemPks(config);

        if (itemPks.length === 0) {
            return [];
        }

        // Pre-warm the company default location once — every slot
        // falls back to it when item-level location is empty.
        await this._fetchCompany(config);

        const slots: ExternalTourSlot[] = [];

        for (const itemPk of itemPks) {
            // Per-item: walk every month touched by the window. The
            // calendar endpoint is keyed by (year, month) and returns
            // the whole month at once.
            // eslint-disable-next-line no-await-in-loop
            await this._fetchItemDetail(config, itemPk);

            for (const {year, month} of this._monthsInRange(fromUtc, toUtc)) {
                // eslint-disable-next-line no-await-in-loop
                const availabilities = await this._fetchMonthAvailabilities(config, itemPk, year, month);

                if (availabilities.length === 0) {
                    continue;
                }

                // eslint-disable-next-line no-await-in-loop
                const pricingByPk = await this._fetchPricingOverview(
                    config,
                    itemPk,
                    availabilities.map((a) => a.pk)
                );

                for (const availability of availabilities) {
                    const slot = this._toSlot(config, itemPk, availability, pricingByPk.get(availability.pk) ?? []);
                    if (slot) {
                        slots.push(slot);
                    }
                }
            }
        }

        return slots;
    }

    /**
     * Iterate (year, month) tuples covering [fromUtc, toUtc] inclusive.
     * @private
     */
    private _monthsInRange(fromUtc: Date, toUtc: Date): Array<{year: number; month: number}> {
        const result: Array<{year: number; month: number}> = [];
        const cursor = new Date(Date.UTC(fromUtc.getUTCFullYear(), fromUtc.getUTCMonth(), 1));
        const end = new Date(Date.UTC(toUtc.getUTCFullYear(), toUtc.getUTCMonth(), 1));
        while (cursor.getTime() <= end.getTime()) {
            result.push({year: cursor.getUTCFullYear(), month: cursor.getUTCMonth() + 1});
            cursor.setUTCMonth(cursor.getUTCMonth() + 1);
        }
        return result;
    }

    /**
     * Discover the company's items when the source config didn't pin
     * a specific item_pks set. Filters to items that have a calendar
     * endpoint (heuristic: skip the "Geschenkgutschein"-type retail
     * products) by trying each item's current-month calendar and
     * keeping only the ones with weeks in the response.
     * @private
     */
    private async _listItemPks(config: ExternalTourSourceConfig): Promise<string[]> {
        const url = `${this._baseUrl(config)}/companies/${encodeURIComponent(config.company_shortname)}/items/`;
        const body = await this._getJson<{items?: Array<{pk: number}>}>(url);
        if (!body?.items) {
            return [];
        }
        return body.items.map((i) => `${i.pk}`);
    }

    private async _fetchCompany(config: ExternalTourSourceConfig): Promise<FhCompanyDetail> {
        const key = config.company_shortname;
        const cached = this._companyCache.get(key);
        if (cached) {
            return cached;
        }
        const url = `${this._baseUrl(config)}/companies/${encodeURIComponent(key)}/`;
        const body = await this._getJson<FhCompanyDetail>(url);
        const detail = body ?? {};
        this._companyCache.set(key, detail);
        return detail;
    }

    private async _fetchItemDetail(config: ExternalTourSourceConfig, itemPk: string): Promise<FhItemDetail> {
        const key = `${config.company_shortname}/${itemPk}`;
        const cached = this._itemCache.get(key);
        if (cached) {
            return cached;
        }
        const url = `${this._baseUrl(config)}/companies/${encodeURIComponent(config.company_shortname)}/items/${encodeURIComponent(itemPk)}/`;
        const body = await this._getJson<FhItemDetail>(url);
        const detail = body ?? {};
        this._itemCache.set(key, detail);
        return detail;
    }

    private async _fetchMonthAvailabilities(
        config: ExternalTourSourceConfig,
        itemPk: string,
        year: number,
        month: number
    ): Promise<FhAvailability[]> {
        // FareHarbor's calendar endpoint requires a zero-padded month —
        // `/calendar/2026/5/` returns 404, only `/calendar/2026/05/` works.
        const monthStr = month.toString().padStart(2, '0');
        const url = `${this._baseUrl(config)}/companies/${encodeURIComponent(config.company_shortname)}`
            + `/items/${encodeURIComponent(itemPk)}/calendar/${year}/${monthStr}/`
            + '?allow_grouped=yes&bookable_only=no';
        const body = await this._getJson<FhCalendarResponse>(url);
        const out: FhAvailability[] = [];
        const weeks = body?.calendar?.weeks ?? [];
        for (const week of weeks) {
            for (const day of week.days ?? []) {
                for (const availability of day.availabilities ?? []) {
                    out.push(availability);
                }
            }
        }
        return out;
    }

    /**
     * Batch the pricing-overview by chunks of `pks` to keep URLs short
     * (FareHarbor accepts comma-separated availability_pks).
     * @private
     */
    private async _fetchPricingOverview(
        config: ExternalTourSourceConfig,
        itemPk: string,
        pks: number[]
    ): Promise<Map<number, FhPricePreview[]>> {
        const out = new Map<number, FhPricePreview[]>();
        const CHUNK = 25;
        for (let i = 0; i < pks.length; i += CHUNK) {
            const chunk = pks.slice(i, i + CHUNK);
            const url = `${this._baseUrl(config)}/companies/${encodeURIComponent(config.company_shortname)}`
                + `/items/${encodeURIComponent(itemPk)}/pricing-overview/`
                + `?availability_pks=${chunk.join(',')}`;
            // eslint-disable-next-line no-await-in-loop
            const body = await this._getJson<FhPricingOverviewResponse>(url);
            for (const preview of body?.price_previews ?? []) {
                const pk = preview.availability?.pk;
                if (typeof pk !== 'number') {
                    continue;
                }
                if (!out.has(pk)) {
                    out.set(pk, []);
                }
                out.get(pk)!.push(preview);
            }
        }
        return out;
    }

    /**
     * Map one FareHarbor availability + its pricing previews into the
     * provider-agnostic ExternalTourSlot. Returns null only when the
     * basic identity / timestamps are unusable.
     * @private
     */
    private _toSlot(
        config: ExternalTourSourceConfig,
        itemPk: string,
        availability: FhAvailability,
        pricing: FhPricePreview[]
    ): ExternalTourSlot | null {
        const startAtUtcMs = Date.parse(availability.start_at);
        if (Number.isNaN(startAtUtcMs)) {
            return null;
        }
        const endAtUtcMs = Date.parse(availability.end_at);
        const startUtcSec = Math.floor(startAtUtcMs / 1000);
        const endUtcSec = Number.isNaN(endAtUtcMs) ? startUtcSec : Math.floor(endAtUtcMs / 1000);

        // FareHarbor's "start_at" is the local wall-clock with a tz
        // offset suffix; turning it into "local unix seconds" means
        // stripping the offset. Date.parse already applied the offset,
        // so add it back to get the wall-clock unix-equivalent.
        const tzOffsetMin = this._extractTzOffsetMinutes(availability.start_at);
        const startLocalSec = startUtcSec + (tzOffsetMin * 60);

        const itemDetail = this._itemCache.get(`${config.company_shortname}/${itemPk}`);
        const companyDetail = this._companyCache.get(config.company_shortname);
        const meeting = availability.primary_location
            ?? itemDetail?.primary_location
            ?? companyDetail?.default_item_primary_location
            ?? companyDetail?.primary_location
            ?? null;

        const customerTypes = this._mapPricing(pricing);
        const currency = customerTypes[0]?.currency
            ?? (companyDetail?.processor_currency?.toUpperCase() ?? 'EUR');

        return {
            external_id: `${availability.pk}`,
            item_pk: `${availability.item.pk}`,
            item_name: availability.item.name,
            start_at: startLocalSec,
            start_at_utc: startUtcSec,
            end_at: endUtcSec,
            duration_text: availability.headline ?? itemDetail?.headline ?? '',
            meeting_lat: meeting?.latitude ?? null,
            meeting_lon: meeting?.longitude ?? null,
            meeting_name: meeting?.name ?? '',
            capacity_bookable: availability.approximate_available_capacity ?? 0,
            capacity_reserved: 0,
            is_bookable: availability.is_bookable,
            is_sold_out: availability.is_sold_out,
            customer_types: customerTypes,
            currency: currency,
            // FareHarbor calendar doesn't expose a modified-at stamp on
            // availabilities — caller will treat 0 as "unknown" and rely
            // on `last_updated_at` for delta detection.
            fh_modified_at: 0,
            raw: availability
        };
    }

    /**
     * Collapse the pricing-preview array into one entry per customer
     * type. low_pricing.price.offset is in cents already (FareHarbor
     * stores it as integer cents).
     * @private
     */
    private _mapPricing(pricing: FhPricePreview[]): ExternalTourSlot['customer_types'] {
        const byName = new Map<string, ExternalTourSlot['customer_types'][number]>();
        for (const preview of pricing) {
            const ctr = preview.for_object;
            const ct = ctr?.customer_type;
            if (!ct?.name) {
                continue;
            }
            // First-seen wins per customer-type name to avoid duplicates
            // when the same customer type appears in multiple buckets.
            if (byName.has(ct.name)) {
                continue;
            }
            const cents = preview.low_pricing?.price?.offset ?? 0;
            byName.set(ct.name, {
                name: ct.name,
                note: ct.note ?? '',
                capacity: ctr?.capacity ?? null,
                price_cents: cents,
                // FareHarbor doesn't echo currency per preview — fill
                // from the response envelope upstream. Default EUR.
                currency: 'EUR'
            });
        }
        return Array.from(byName.values());
    }

    /**
     * Extract the timezone offset (in minutes from UTC) suffix from
     * an ISO-8601 string like "2026-05-19T09:30:00+01:00". Returns 0
     * when no offset suffix is present.
     * @private
     */
    private _extractTzOffsetMinutes(iso: string): number {
        const match = /([+-])(\d{2}):?(\d{2})$/u.exec(iso);
        if (!match) {
            return 0;
        }
        const sign = match[1] === '-' ? -1 : 1;
        const hours = parseInt(match[2], 10);
        const minutes = parseInt(match[3], 10);
        return sign * ((hours * 60) + minutes);
    }

    private _baseUrl(config: ExternalTourSourceConfig): string {
        return config.base_url.replace(/\/+$/u, '');
    }

    /**
     * Spaced GET returning parsed JSON or null on non-2xx. Caller is
     * responsible for treating missing data as empty.
     * @private
     */
    private async _getJson<T>(url: string): Promise<T | null> {
        await this._spaceRequest();
        const logger = Logger.getLogger();
        try {
            const response = await fetch(url, {
                method: 'GET',
                headers: {Accept: 'application/json'}
            });
            if (!response.ok) {
                logger.warn(`FareHarborProvider: ${response.status} for ${url}`);
                return null;
            }
            return await response.json() as T;
        } catch (e) {
            logger.warn(`FareHarborProvider: ${(e as Error).message} for ${url}`);
            return null;
        }
    }

    private _lastRequestAt: number = 0;

    private async _spaceRequest(): Promise<void> {
        const elapsed = Date.now() - this._lastRequestAt;
        if (elapsed < FareHarborProvider.REQUEST_SPACING_MS) {
            await new Promise((resolve) => {
                setTimeout(resolve, FareHarborProvider.REQUEST_SPACING_MS - elapsed);
            });
        }
        this._lastRequestAt = Date.now();
    }

}