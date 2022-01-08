import {BaseEntity, Column, Entity, PrimaryGeneratedColumn} from 'typeorm';

@Entity({name: 'organization'})
export class Organization extends BaseEntity {

    @PrimaryGeneratedColumn()
        // @ts-ignore
    id: number;

    @Column({
        type: 'varchar',
        length: '128',
        default: ''
    })
        // @ts-ignore
    country: string;

    @Column({
        type: 'varchar',
        length: '255',
        default: ''
    })
        // @ts-ignore
    location: string;

    @Column({
        type: 'float',
        default: 0
    })
        // @ts-ignore
    lat: number;

    @Column({
        type: 'float',
        default: 0
    })
        // @ts-ignore
    lon: number;

    @Column({
        type: 'text',
        default: ''
    })
        // @ts-ignore
    description: string;

}