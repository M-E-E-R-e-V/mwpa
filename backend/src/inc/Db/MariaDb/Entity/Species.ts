import {BaseEntity, Column, Entity, Index, PrimaryGeneratedColumn} from 'typeorm';

/**
 * Species Entity
 */
@Entity({name: 'species'})
export class Species extends BaseEntity {

    /**
     * id of specie
     */
    @PrimaryGeneratedColumn()
    public id!: number;

    /**
     * ott id
     * see https://github.com/OpenTreeOfLife/germinator/wiki/TNRS-API-v3
     */
    @Index()
    @Column({
        default: 0
    })
    public ott_id!: number;

    /**
     * name of specie
     */
    @Index()
    @Column({
        type: 'varchar',
        length: 255
    })
    public name!: string;

    /**
     * species group id
     * a intern id for sorting and coloring
     */
    @Index()
    @Column({
        default: 0
    })
    public species_groupid!: number;

    /**
     * is deleted
     * mark for entry is deleted (not selectable, only show as history)
     */
    @Column({
        default: false
    })
        // @ts-ignore
    isdeleted: boolean;

}