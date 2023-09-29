import {BaseEntity, Column, Entity, Index, PrimaryGeneratedColumn} from 'typeorm';

/**
 * SpeciesExternLink
 */
@Entity({name: 'species_extern_link'})
export class SpeciesExternLink extends BaseEntity {

    /**
     * id of receiver
     */
    @PrimaryGeneratedColumn()
    public id!: number;

    @Index()
    @Column({
        default: 0
    })
    public external_receiver_id!: number;

    @Index()
    @Column({
        default: 0
    })
    public species_id!: number;

    /**
     * An ID from receiver, describes ours species.
     */
    @Index()
    @Column({
        type: 'varchar',
        length: 255
    })
    public externid!: string;

    @Column({
        type: 'varchar',
        length: 512,
        default: ''
    })
    public externname!: string;

}