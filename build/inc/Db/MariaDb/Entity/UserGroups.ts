import {BaseEntity, Column, Entity, Index, PrimaryGeneratedColumn} from 'typeorm';

@Entity({name: 'user_groups'})
export class UserGroups extends BaseEntity {

    @PrimaryGeneratedColumn()
        // @ts-ignore
    id: number;

    @Index()
    @Column()
        // @ts-ignore
    user_id: number;

    @Index()
    @Column()
        // @ts-ignore
    group_id: number;

}