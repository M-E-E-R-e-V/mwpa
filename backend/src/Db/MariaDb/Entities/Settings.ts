import {DBBaseEntityUnid} from 'figtree';
import {Column, Entity, Index} from 'typeorm';

/**
 * Settings
 */
@Entity({name: 'settings'})
export class Settings extends DBBaseEntityUnid {

    /**
     * Name
     */
    @Index()
    @Column({
        type: 'varchar',
        length: 255,
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