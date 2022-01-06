import {BaseEntity, Column, Entity, PrimaryGeneratedColumn} from 'typeorm';

@Entity({name: 'group'})
export class Group extends BaseEntity {

    @PrimaryGeneratedColumn()
        // @ts-ignore
    id: number;

    @Column()
        // @ts-ignore
    role: string;

    @Column()
        // @ts-ignore
    description: string;

}