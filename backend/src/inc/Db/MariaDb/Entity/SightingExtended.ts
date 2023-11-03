import {BaseEntity, Column, Entity, Index, PrimaryGeneratedColumn} from 'typeorm';

@Entity({name: 'sighting_extended'})
export class SightingExtended extends BaseEntity {

    @PrimaryGeneratedColumn('uuid')
    public unid!: string;

    @Index()
    @Column()
    public sighting_id!: number;

    @Index()
    @Column({
        type: 'varchar',
        length: 128,
        default: ''
    })
    public name!: string;

    @Column({
        type: 'text',
        default: ''
    })
    public data!: string;

}