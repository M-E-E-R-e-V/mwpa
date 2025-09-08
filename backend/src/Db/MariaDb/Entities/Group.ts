import {DBBaseEntityId} from 'figtree';
import {Column, Entity, Index} from 'typeorm';

/**
 * Group
 */
@Entity({name: 'group'})
export class Group extends DBBaseEntityId {

    /**
     * Role
     */
    @Column({
        type: 'varchar',
        length: 128,
        default: ''
    })
    public role!: string;

    /**
     * Organization id
     */
    @Index()
    @Column()
    public organization_id!: number;

    /**
     * Description
     */
    @Column({
        type: 'text',
        default: ''
    })
    public description!: string;

}