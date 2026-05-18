import {DBBaseEntityId} from 'figtree';
import {Column, Entity, Index, Unique} from 'typeorm';

/**
 * Per-organization configuration for pulling planned tour schedules
 * from an external booking provider (currently FareHarbor, designed
 * provider-agnostic).
 *
 * One source produces N entries in `external_tour` per refresh cycle.
 * `last_full_pull_at` carries the unix-seconds timestamp of the last
 * successful cron run so the admin UI can show staleness; the cron
 * itself never skips based on it (refresh strategy is window-based,
 * not delta-based).
 */
@Entity({name: 'organization_external_tour_source'})
@Unique(['organization_id', 'provider', 'company_shortname'])
export class OrganizationExternalTourSource extends DBBaseEntityId {

    @Index()
    @Column()
    public organization_id!: number;

    /**
     * Provider key. Matches the `name` field on the corresponding
     * provider class (see ExternalTourProvider.name).
     */
    @Index()
    @Column({
        type: 'varchar',
        length: 32,
        default: 'fareharbor'
    })
    public provider!: string;

    /**
     * Provider base URL without trailing slash. Stored per-source so a
     * different env / region (e.g. fareharbor.com vs partner CDN) can
     * be picked without touching code.
     */
    @Column({
        type: 'varchar',
        length: 255,
        default: 'https://fareharbor.com/api/v1'
    })
    public base_url!: string;

    /**
     * Provider-specific company identifier. For FareHarbor: the URL
     * slug ("whalewatching-gomera"). For future providers: whatever
     * identifies an operator account.
     */
    @Column({
        type: 'varchar',
        length: 128,
        default: ''
    })
    public company_shortname!: string;

    /**
     * JSON array of item primary keys to pull, e.g. ["326313"].
     * Empty array means "all items the provider exposes for this
     * company". Filtering is intentional: providers often expose
     * non-tour items (gift vouchers, merch) we don't want to ingest.
     */
    @Column({
        type: 'text'
    })
    public item_pks!: string;

    /**
     * Soft enable/disable from the admin UI. Disabled sources are
     * skipped by the cron without touching their existing
     * external_tour rows.
     */
    @Column({
        default: true
    })
    public enabled!: boolean;

    /**
     * Unix-seconds timestamp of the last successful full refresh
     * cycle for this source. 0 == never. Read by the admin UI for
     * staleness display.
     */
    @Column({
        default: 0
    })
    public last_full_pull_at!: number;

    /**
     * Last error message from the most recent failed refresh, if any.
     * Cleared on the next successful pull. Surfaced verbatim in the
     * admin UI for troubleshooting.
     */
    @Column({
        type: 'text',
        nullable: true
    })
    public last_error!: string | null;

    @Column({
        default: 0
    })
    public create_datetime!: number;

    @Column({
        default: 0
    })
    public update_datetime!: number;

}