import {BaseEntity, Column, Entity, Index, PrimaryGeneratedColumn} from 'typeorm';

@Entity({name: 'group'})
export class Group extends BaseEntity {

    @PrimaryGeneratedColumn()
        // @ts-ignore
    id: number;

    @Column({
        type: 'varchar',
        length: 128,
        default: ''
    })
        // @ts-ignore
    role: string;

    @Index()
    @Column()
        // @ts-ignore
    organization_id: number;

    @Column({
        type: 'text',
        default: ''
    })
        // @ts-ignore
    description: string;

}