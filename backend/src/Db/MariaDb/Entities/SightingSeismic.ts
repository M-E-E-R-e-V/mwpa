import {DBBaseEntityId} from 'figtree';
import {Column, Entity, Index, Unique} from 'typeorm';

/**
 * Many-to-many bridge: every sighting × nearby-earthquake pair within
 * the configured radius + window. Magnitude is denormalised so the
 * species-profile aggregation can histogram without joining `earthquake`.
 */
@Entity({name: 'sighting_seismic'})
@Unique('sighting_seismic_uniq', ['sighting_id', 'earthquake_id'])
export class SightingSeismic extends DBBaseEntityId {

    @Index()
    @Column()
    public sighting_id!: number;

    @Index()
    @Column()
    public earthquake_id!: number;

    /**
     * Great-circle distance between sighting position and epicenter.
     */
    @Column({
        type: 'double',
        default: 0
    })
    public distance_km!: number;

    /**
     * Hours between earthquake origin and sighting tour start; signed,
     * positive when the earthquake came first.
     */
    @Column({
        type: 'double',
        default: 0
    })
    public hours_offset!: number;

    /**
     * Snapshot of `earthquake.magnitude` for fast aggregations.
     */
    @Index()
    @Column({
        type: 'double',
        default: 0
    })
    public magnitude!: number;

    @Column({
        default: 0
    })
    public create_datetime!: number;

}