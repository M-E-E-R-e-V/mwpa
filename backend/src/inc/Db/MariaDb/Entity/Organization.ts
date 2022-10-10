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
        type: 'varchar',
        length: '255',
        default: ''
    })
        // @ts-ignore
    lat: string;

    @Column({
        type: 'varchar',
        length: '255',
        default: ''
    })
        // @ts-ignore
    lon: string;

    @Column({
        type: 'text',
        default: ''
    })
        // @ts-ignore
    description: string;

}