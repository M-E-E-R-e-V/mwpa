import {DBBaseEntityUnid} from 'figtree';
import {Column, Entity, Index} from 'typeorm';

/**
 * SightingTourTracking
 */
@Entity({name: 'sighting_tour_tracking'})
export class SightingTourTracking extends DBBaseEntityUnid {

    /**
     * create datetime
     */
    @Index()
    @Column({
        default: 0
    })
    public create_datetime!: number;

    /**
     * sighting tour id
     */
    @Index()
    @Column({
        default: 0
    })
    public sighting_tour_id!: number;

    /**
     * position
     */
    @Column({
        type: 'text',
        default: ''
    })
    public position!: string;

}