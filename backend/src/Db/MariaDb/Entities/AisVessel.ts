import {DBBaseEntityId} from 'figtree';
import {Column, Entity, Index, Unique} from 'typeorm';

/**
 * Static AIS vessel metadata cache, populated from AIS message types
 * 5 (Class A static) and 24 (Class B static). One row per MMSI.
 *
 * Lives forever — vessel identities change rarely and the table
 * stays tiny (~150 vessels in the Canaries area = 15 KB). When a
 * vessel changes name (rare), the upsert overwrites in place; the
 * historical name is lost. That's an acceptable trade-off for the
 * dramatic storage saving over duplicating name+flag on every ping.
 *
 * Joins:
 *   - LiveAisTrack joins on `mmsi` for "show this ping's vessel"
 *   - TourAisVessel snapshots name+flag at write time (so historical
 *     tour records remain stable even if the vessel later changes
 *     name)
 */
@Entity({name: 'ais_vessel'})
@Unique(['mmsi'])
export class AisVessel extends DBBaseEntityId {

    // No explicit @Index — `@Unique(['mmsi'])` on the class already
    // creates the index. Adding both decorators against the same
    // single column generates duplicate IDX_… names on table create.
    @Column({
        type: 'varchar',
        length: 16
    })
    public mmsi!: string;

    /**
     * IMO number — 7-digit international identifier. Stays the same
     * across renaming / flag changes. Optional; some vessels (small
     * fishing, recreational) don't have one.
     */
    @Column({
        type: 'varchar',
        length: 16,
        default: ''
    })
    public imo!: string;

    /**
     * Free-text vessel name as broadcast in AIS message 5/24. Often
     * has trailing AIS-padding chars (`@`) — the service trims them
     * before insert.
     */
    @Column({
        type: 'varchar',
        length: 64,
        default: ''
    })
    public name!: string;

    /**
     * Radio callsign.
     */
    @Column({
        type: 'varchar',
        length: 16,
        default: ''
    })
    public callsign!: string;

    /**
     * AIS ship-type code (1..99 per ITU-R M.1371).
     */
    @Column({
        type: 'smallint',
        nullable: true
    })
    public ship_type!: number | null;

    /**
     * ISO-3 flag-state code derived from the MMSI's MID (Maritime
     * Identification Digits, first 3 digits). Empty when the MID
     * isn't in the lookup table.
     */
    @Index()
    @Column({
        type: 'varchar',
        length: 8,
        default: ''
    })
    public flag!: string;

    /**
     * Vessel length in metres (bow + stern, from AIS dimensions).
     */
    @Column({
        type: 'smallint',
        nullable: true
    })
    public length_m!: number | null;

    /**
     * Vessel beam (width) in metres.
     */
    @Column({
        type: 'smallint',
        nullable: true
    })
    public beam_m!: number | null;

    /**
     * Last time this row was touched (insert or update). Lets the UI
     * show "vessel last seen ...".
     */
    @Index()
    @Column()
    public last_updated_at!: number;

}