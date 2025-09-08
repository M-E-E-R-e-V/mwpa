import {DBBaseEntityId} from 'figtree';
import {Column, Entity, Index} from 'typeorm';

/**
 * SpeciesExternLink
 */
@Entity({name: 'species_extern_link'})
export class SpeciesExternLink extends DBBaseEntityId {

    /**
     * External receiver id
     */
    @Index()
    @Column({
        default: 0
    })
    public external_receiver_id!: number;

    /**
     * Species id
     */
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

    /**
     * Externname
     */
    @Column({
        type: 'varchar',
        length: 512,
        default: ''
    })
    public externname!: string;

}