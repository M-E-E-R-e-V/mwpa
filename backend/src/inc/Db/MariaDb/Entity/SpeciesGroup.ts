import {BaseEntity, Column, Entity, Index, PrimaryGeneratedColumn} from 'typeorm';

/**
 * Species Group
 */
@Entity({name: 'species_group'})
export class SpeciesGroup extends BaseEntity {

    /**
     * id of specie group
     */
    @PrimaryGeneratedColumn()
    public id!: number;

    /**
     * name of species group
     */
    @Index()
    @Column({
        type: 'varchar',
        length: 255
    })
    public name!: string;

    @Column({
        type: 'varchar',
        length: 25
    })
    public color!: string;

}