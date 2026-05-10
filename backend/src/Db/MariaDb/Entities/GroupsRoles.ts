import {Entity, PrimaryColumn, BaseEntity} from 'typeorm';

/**
 * Join: groups -> users_roles (many-to-many).
 * MWPA assigns roles at the group level (a user inherits all roles from the
 * groups they are a member of), unlike kavula which assigns roles directly to
 * users.
 */
@Entity({name: 'groups_roles'})
export class GroupsRoles extends BaseEntity {

    @PrimaryColumn({name: 'groups_id', type: 'int'})
    public groupId!: number;

    @PrimaryColumn({name: 'users_roles_id', type: 'int'})
    public usersRoleId!: number;

}