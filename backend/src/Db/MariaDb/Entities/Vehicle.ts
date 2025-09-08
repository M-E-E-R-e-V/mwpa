import {DBBaseEntityId} from 'figtree';
import {Column, Entity, Index} from 'typeorm';

/**
 * Vehicle Entity
 */
@Entity({name: 'vehicle'})
export class Vehicle extends DBBaseEntityId {

    /**
     * Description
     */
    @Index()
    @Column({
        type: 'varchar',
        length: 512
    })
    public description!: string;

    /**
     * Organization id
     */
    @Index()
    @Column()
    public organization_id!: number;

    /**
     * is deleted
     */
    @Column({
        default: false
    })
    public isdeleted!: boolean;

}