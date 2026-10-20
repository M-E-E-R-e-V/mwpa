import {DBBaseEntityId} from '@stefanwerfling/figtree';
import {Column, Entity} from 'typeorm';

/**
 * Users rights
 */
@Entity({name: 'users_rights'})
export class UsersRights extends DBBaseEntityId {

    /**
     * Right key
     */
    @Column({
        type: 'varchar'
    })
    public key!: string;

}