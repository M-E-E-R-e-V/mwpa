import {BaseEntity, Column, Entity, Index, PrimaryGeneratedColumn} from 'typeorm';

@Entity({name: 'settings'})
export class Settings extends BaseEntity {

    @PrimaryGeneratedColumn('uuid')
    public unid!: string;

    @Index()
    @Column({
        type: 'varchar',
        length: 255,
        default: ''
    })
    public name!: string;

    @Column({
        type: 'text',
        default: ''
    })
    public data!: string;

}