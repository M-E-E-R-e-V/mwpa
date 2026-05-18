import {DBBaseEntityId} from 'figtree';
import {Column, Entity, Index, Unique} from 'typeorm';

/**
 * One scheduled tour slot fetched from an external booking provider
 * (FareHarbor for now). Independent of `sighting_tour` — those are
 * actually-performed tours logged by the crew via the mobile app; an
 * external_tour entry is what the *operator* has published as
 * available for booking.
 *
 * Refresh policy is window-based: the service re-pulls every entry
 * whose `start_at` is still in the future (or recent enough that
 * last-minute bookings could still mutate `capacity_reserved` /
 * `is_sold_out`). Once a slot's start time is comfortably past, it
 * freezes — the row stays as a historical record of what was
 * scheduled and how full it got.
 *
 * Identity: (provider, external_id) is unique. The provider key
 * matches OrganizationExternalTourSource.provider and the relevant
 * ExternalTourProvider class name.
 */
@Entity({name: 'external_tour'})
@Unique(['provider', 'external_id'])
export class ExternalTour extends DBBaseEntityId {

    @Index()
    @Column()
    public organization_id!: number;

    @Index()
    @Column()
    public source_id!: number;

    @Index()
    @Column({
        type: 'varchar',
        length: 32,
        default: 'fareharbor'
    })
    public provider!: string;

    /**
     * Provider-side primary key for this slot. FareHarbor: the
     * `availability.pk` (e.g. "1825742608"). Stored as string for
     * provider-agnostic identity — providers that hand out non-numeric
     * ids work too.
     */
    @Index()
    @Column({
        type: 'varchar',
        length: 128
    })
    public external_id!: string;

    /**
     * Provider-side item id. Useful for grouping multiple slots of
     * the same offering and for routing back to the provider's
     * item-detail endpoint.
     */
    @Index()
    @Column({
        type: 'varchar',
        length: 128,
        default: ''
    })
    public item_pk!: string;

    @Column({
        type: 'varchar',
        length: 255,
        default: ''
    })
    public item_name!: string;

    /**
     * Slot start. Stored both as the provider's wall-clock time
     * (start_at) and the resolved UTC moment (start_at_utc) so the
     * UI can render the local label without re-doing tz math and the
     * cron can window-query in UTC.
     */
    @Index()
    @Column({
        default: 0
    })
    public start_at!: number;

    @Index()
    @Column({
        default: 0
    })
    public start_at_utc!: number;

    @Column({
        default: 0
    })
    public end_at!: number;

    /**
     * Human-readable duration label from the provider ("Dauer: 3-4
     * Stunden"). Not parsed — we trust the provider's wording.
     */
    @Column({
        type: 'varchar',
        length: 255,
        default: ''
    })
    public duration_text!: string;

    /**
     * Meeting-point coordinates. Falls back from item-level to
     * company-level default in the provider mapper, so this is the
     * authoritative single point per slot.
     */
    @Column({
        type: 'double',
        nullable: true
    })
    public meeting_lat!: number | null;

    @Column({
        type: 'double',
        nullable: true
    })
    public meeting_lon!: number | null;

    @Column({
        type: 'varchar',
        length: 255,
        default: ''
    })
    public meeting_name!: string;

    /**
     * FareHarbor: `bookable_capacity` from the availability detail.
     * Represents seats the provider can still sell — not necessarily
     * total seats (some are reserved by other channels).
     */
    @Column({
        default: 0
    })
    public capacity_bookable!: number;

    /**
     * FareHarbor: `reserved_capacity`. The seats already taken.
     * Fills over time; once == bookable+reserved, `is_sold_out` flips.
     */
    @Column({
        default: 0
    })
    public capacity_reserved!: number;

    @Column({
        default: false
    })
    public is_bookable!: boolean;

    @Column({
        default: false
    })
    public is_sold_out!: boolean;

    /**
     * JSON array of `{name, note, capacity, price_cents, currency}`
     * per customer type (Erwachsene / Kind / Säugling for FareHarbor).
     * Free-form because the provider may change the breakdown.
     */
    @Column({
        type: 'text'
    })
    public customer_types!: string;

    /**
     * Currency code (3-letter ISO) from the provider, denormalised
     * for easy filtering / display. Repeated in customer_types[].
     */
    @Column({
        type: 'varchar',
        length: 8,
        default: 'EUR'
    })
    public currency!: string;

    /**
     * Provider's last-modified timestamp for the slot (unix sec).
     * Used to detect remote changes between our pulls — even when
     * our local values look stable.
     */
    @Column({
        default: 0
    })
    public fh_modified_at!: number;

    /**
     * Unix-seconds timestamp of the most recent successful pull that
     * saw this slot in the provider's response. Refresh-cycle slots
     * that disappear get noticed via this stamp (they no longer
     * advance) but are NOT auto-deleted — they may be cancelled or
     * the provider may simply hide passed slots.
     */
    @Index()
    @Column({
        default: 0
    })
    public last_seen_at!: number;

    /**
     * Last time WE updated the row (always advances on a refresh,
     * even if no field changed). Useful for "show me everything
     * touched in the last hour" queries.
     */
    @Index()
    @Column({
        default: 0
    })
    public last_updated_at!: number;

    /**
     * Full raw provider payload for debugging / future field
     * additions. Long-text so JSON of arbitrary size fits.
     */
    @Column({
        type: 'longtext',
        nullable: true
    })
    public raw!: string | null;

    @Column({
        default: 0
    })
    public create_datetime!: number;

}