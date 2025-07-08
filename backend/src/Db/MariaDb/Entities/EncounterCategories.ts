import {DBBaseEntityId} from 'figtree';
import {Column, Entity, Index} from 'typeorm';

/**
 * Encounter categories entity
 */
@Entity({name: 'encounter_categories'})
export class EncounterCategories extends DBBaseEntityId {

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
     * Description
     */
    @Column({
        type: 'text',
        default: ''
    })
    public description!: string;

    /**
     * Is deleted
     */
    @Column({
        default: false
    })
    public isdeleted!: boolean;

}