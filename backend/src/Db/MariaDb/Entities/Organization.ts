import {DBBaseEntityId} from 'figtree';
import {Column, Entity} from 'typeorm';

/**
 * Organization
 */
@Entity({name: 'organization'})
export class Organization extends DBBaseEntityId {

    /**
     * Country
     */
    @Column({
        type: 'varchar',
        length: '128',
        default: ''
    })
    public country!: string;

    /**
     * Location
     */
    @Column({
        type: 'varchar',
        length: '255',
        default: ''
    })
    public location!: string;

    /**
     * Latitude
     */
    @Column({
        type: 'varchar',
        length: '255',
        default: ''
    })
    public lat!: string;

    /**
     * Longitude
     */
    @Column({
        type: 'varchar',
        length: '255',
        default: ''
    })
    public lon!: string;

    /**
     * Description
     */
    @Column({
        type: 'text',
        default: ''
    })
    public description!: string;

}