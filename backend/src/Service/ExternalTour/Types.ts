/**
 * Provider-agnostic shape returned by ExternalTourProvider.fetchSchedule.
 * Each entry is a single bookable slot (one start_at, one end_at) the
 * operator has published — independent of whether anybody booked it.
 *
 * Mappers in concrete providers (e.g. FareHarborProvider) translate
 * the upstream shape into this. Fields not supplied by a particular
 * provider use the documented zero/empty defaults.
 */
export type ExternalTourSlot = {
    /** Provider-side primary key, stringified for provider-agnostic identity. */
    external_id: string;

    /** Provider-side item / offering identifier. */
    item_pk: string;
    item_name: string;

    /**
     * Wall-clock start time in the company's local timezone as unix
     * seconds. This is what UI labels show; do NOT do arithmetic on
     * it across timezones.
     */
    start_at: number;

    /** Same instant, resolved to UTC. Use this for windowing / sorting. */
    start_at_utc: number;

    /** Wall-clock end time, unix seconds. Equal to start_at when unknown. */
    end_at: number;

    /** Free-form provider duration label ("Dauer: 3-4 Stunden"). */
    duration_text: string;

    /** Meeting-point coordinates with provider-level fallbacks applied. */
    meeting_lat: number | null;
    meeting_lon: number | null;
    meeting_name: string;

    /** Seats the provider can still sell. */
    capacity_bookable: number;

    /** Seats already reserved. */
    capacity_reserved: number;

    is_bookable: boolean;
    is_sold_out: boolean;

    /**
     * Per-customer-type price + capacity breakdown — provider-shaped,
     * stored as JSON in the DB. Empty array when no pricing was
     * available (e.g. provider returned no price_previews).
     */
    customer_types: Array<{
        name: string;
        note: string;
        capacity: number | null;
        price_cents: number;
        currency: string;
    }>;

    /** ISO currency, denormalised from the first customer_types entry. */
    currency: string;

    /** Provider's last-modified timestamp for the slot, unix seconds. 0 = unknown. */
    fh_modified_at: number;

    /** Full raw provider payload — kept verbatim for debugging / forward-compat. */
    raw: unknown;
};

/**
 * Per-source config the cron passes to a provider so the provider
 * doesn't need to know about the OrganizationExternalTourSource
 * entity at all.
 */
export type ExternalTourSourceConfig = {
    base_url: string;
    company_shortname: string;
    /** Empty array = "all items the provider exposes". */
    item_pks: string[];
};

/**
 * Provider abstraction. Implementations are stateless; the cron
 * constructs them at startup and reuses them for every tick.
 */
export interface ExternalTourProvider {

    /** Stable identifier persisted in `external_tour.provider`. */
    readonly name: string;

    /**
     * Fetch all bookable slots within the given UTC window for the
     * configured source. Implementations decide how to batch upstream
     * calls (per-month, per-day, etc.) and must respect provider rate
     * limits with their own pacing.
     *
     * Should NOT throw on per-slot mapping failures — those slots get
     * skipped silently. A thrown error means "the whole pull failed,
     * try again next tick", recorded as last_error on the source row.
     */
    fetchSchedule(
        config: ExternalTourSourceConfig,
        fromUtc: Date,
        toUtc: Date
    ): Promise<ExternalTourSlot[]>;

}