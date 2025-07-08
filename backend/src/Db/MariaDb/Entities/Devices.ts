import {DBBaseEntityId} from 'figtree';
import {Column, Entity, Index} from 'typeorm';

/**
 * Devices entity
 */
@Entity({name: 'devices'})
export class Devices extends DBBaseEntityId {

    /**
     * Identity
     */
    @Column({
        type: 'varchar',
        length: 128
    })
    public identity!: string;

    /**
     * User id
     */
    @Index()
    @Column()
    public user_id!: number;

    /**
     * Description
     */
    @Column({
        type: 'text',
        default: ''
    })
    public description!: string;

    /**
     * Create datetime
     */
    @Index()
    @Column({
        default: 0
    })
    public create_datetime!: number;

    /**
     * Update datetime
     */
    @Index()
    @Column({
        default: 0
    })
    public update_datetime!: number;

}