import {BaseEntity, Column, Entity, Index, PrimaryGeneratedColumn} from 'typeorm';

/**
 * EncounterCategories
 */
@Entity({name: 'encounter_categories'})
export class EncounterCategories extends BaseEntity {

    /**
     * id for Encounter categories
     */
    @PrimaryGeneratedColumn()
        // @ts-ignore
    id: number;

    @Index()
    @Column({
        type: 'varchar',
        length: 128,
        default: ''
    })
        // @ts-ignore
    name: string;

    /**
     * description
     */
    @Column({
        type: 'text',
        default: ''
    })
        // @ts-ignore
    description: string;

}