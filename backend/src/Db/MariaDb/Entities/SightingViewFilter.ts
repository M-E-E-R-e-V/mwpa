import {DBBaseEntityUnid} from 'figtree';
import {Column, Entity} from 'typeorm';

/**
 * Sighting view filter
 */
@Entity({name: 'sighting_view_filter'})
export class SightingViewFilter extends DBBaseEntityUnid {

    /**
     * Title
     */
    @Column({
        type: 'varchar',
        length: 250,
        default: ''
    })
    public title!: string;

    /**
     * postition
     */
    @Column({
        default: 0
    })
    public position!: number;

    /**
     * Settings
     */
    @Column({
        type: 'text',
        default: ''
    })
    public settings!: string;

}