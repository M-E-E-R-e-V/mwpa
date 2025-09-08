import {DBBaseEntityId} from 'figtree';
import {Entity, Column, Index} from 'typeorm';

/**
 * User Entity
 */
@Entity({name: 'user'})
export class User extends DBBaseEntityId {

    /**
     * Username
     */
    @Index()
    @Column({
        type: 'varchar',
        length: 128
    })
    public username!: string;

    /**
     * Full name
     */
    @Column({
        type: 'varchar',
        length: 255,
        default: ''
    })
    public full_name!: string;

    /**
     * Password (hash)
     */
    @Column()
    public password!: string;

    /**
     * Pin for app
     */
    @Column()
    public pin!: string;

    /**
     * EMail
     */
    @Index()
    @Column({
        type: 'varchar',
        length: 255,
        default: ''
    })
    public email!: string;

    /**
     * Main groupid
     */
    @Index()
    @Column({
        default: 0
    })
    public main_groupid!: number;

    /**
     * Is admin
     */
    @Index()
    @Column({
        type: 'boolean',
        default: false
    })
    public isAdmin!: boolean;

    /**
     * Disable
     */
    @Index()
    @Column({
        type: 'boolean',
        default: true
    })
    public disable!: boolean;

}