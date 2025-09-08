import {DBBaseEntityUnid} from 'figtree';
import {Column, Entity, Index} from 'typeorm';

/**
 * Sighting extended
 */
@Entity({name: 'sighting_extended'})
export class SightingExtended extends DBBaseEntityUnid {

    /**
     * Sighting id
     */
    @Index()
    @Column()
    public sighting_id!: number;

    /**
     * Name
     */
    @Index()
    @Column({
        type: 'varchar',
        length: 128,
        default: ''
    })
    public name!: string;

    /**
     * Data
     */
    @Column({
        type: 'text',
        default: ''
    })
    public data!: string;

}