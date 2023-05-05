import {Entity, PrimaryGeneratedColumn, Column, BaseEntity, Index} from 'typeorm';

/**
 * User Entity
 */
@Entity({name: 'user'})
export class User extends BaseEntity {

    @PrimaryGeneratedColumn()
    public id!: number;

    @Index()
    @Column({
        type: 'varchar',
        length: 128
    })
    public username!: string;

    @Column({
        type: 'varchar',
        length: 255,
        default: ''
    })
    public full_name!: string;

    @Column()
    public password!: string;

    @Column()
    public pin!: string;

    @Index()
    @Column({
        type: 'varchar',
        length: 255,
        default: ''
    })
    public email!: string;

    @Index()
    @Column({
        default: 0
    })
    public main_groupid!: number;

    @Index()
    @Column({
        type: 'boolean',
        default: false
    })
    public isAdmin!: boolean;

    @Index()
    @Column({
        type: 'boolean',
        default: true
    })
    public disable!: boolean;

}