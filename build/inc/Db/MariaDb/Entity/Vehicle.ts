import {BaseEntity, Column, Entity, Index, PrimaryGeneratedColumn} from 'typeorm';

/**
 * Vehicle Entity
 */
@Entity({name: 'vehicle'})
export class Vehicle extends BaseEntity {

    @PrimaryGeneratedColumn()
        // @ts-ignore
    id: number;

    @Index()
    @Column({
        type: 'varchar',
        length: 512
    })
        // @ts-ignore
    description: string;

    @Index()
    @Column()
        // @ts-ignore
    organization_id: number;

}