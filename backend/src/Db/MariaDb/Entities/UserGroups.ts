import {DBBaseEntityId} from 'figtree';
import {Column, Entity, Index} from 'typeorm';

/**
 * USer groups
 */
@Entity({name: 'user_groups'})
export class UserGroups extends DBBaseEntityId {

    /**
     * User id
     */
    @Index()
    @Column()
    public user_id!: number;

    /**
     * Group id
     */
    @Index()
    @Column()
    public group_id!: number;

}