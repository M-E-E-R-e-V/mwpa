import {DBBaseEntityId} from 'figtree';
import {Column, Entity} from 'typeorm';

/**
 * Users roles
 */
@Entity({name: 'users_roles'})
export class UsersRoles extends DBBaseEntityId {

    /**
     * Role name
     */
    @Column({
        type: 'varchar'
    })
    public name!: string;

}