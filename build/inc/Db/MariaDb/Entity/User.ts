import {Entity, PrimaryGeneratedColumn, Column, BaseEntity, Index} from 'typeorm';

/**
 * User Entity
 */
@Entity({name: 'user'})
export class User extends BaseEntity {

    @PrimaryGeneratedColumn()
        // @ts-ignore
    id: number;

    @Index()
    @Column()
        // @ts-ignore
    name: string;

    @Column()
        // @ts-ignore
    full_name: string;

    @Column()
        // @ts-ignore
    password: string;

    @Index()
    @Column()
        // @ts-ignore
    email: string;

    @Column()
        // @ts-ignore
    groupid: number;

    @Column()
        // @ts-ignore
    isAdmin: number;

}