import {BaseEntity, Column, Entity, PrimaryGeneratedColumn} from 'typeorm';

@Entity({name: 'sighting_view_filter'})
export class SightingViewFilter extends BaseEntity {

    @PrimaryGeneratedColumn('uuid')
    public unid!: string;

    @Column({
        type: 'varchar',
        length: 250,
        default: ''
    })
    public title!: string;

    @Column({
        default: 0
    })
    public position!: number;

    @Column({
        type: 'text',
        default: ''
    })
    public settings!: string;

}