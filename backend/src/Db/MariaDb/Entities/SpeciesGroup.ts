import {DBBaseEntityId} from 'figtree';
import {Column, Entity, Index} from 'typeorm';

/**
 * Species Group
 */
@Entity({name: 'species_group'})
export class SpeciesGroup extends DBBaseEntityId {

    /**
     * name of species group
     */
    @Index()
    @Column({
        type: 'varchar',
        length: 255
    })
    public name!: string;

    /**
     * Color Hex
     */
    @Column({
        type: 'varchar',
        length: 25
    })
    public color!: string;

}