import {Entity, PrimaryColumn, BaseEntity} from 'typeorm';

/**
 * Join: users_roles -> users_rights (many-to-many).
 */
@Entity({name: 'users_role_rights'})
export class UsersRoleRights extends BaseEntity {

    @PrimaryColumn({name: 'users_roles_id', type: 'int'})
    public usersRoleId!: number;

    @PrimaryColumn({name: 'users_rights_id', type: 'int'})
    public usersRightId!: number;

}