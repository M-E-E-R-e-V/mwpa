import {BaseEntity, Column, Entity, Index, PrimaryGeneratedColumn} from 'typeorm';

/**
 * Species Entity
 */
@Entity({name: 'species'})
export class Species extends BaseEntity {

    @PrimaryGeneratedColumn()
        // @ts-ignore
    id: number;

    @Index()
    @Column({
        default: 0
    })
    // @ts-ignore
    ott_id: number;

    @Index()
    @Column({
        type: 'varchar',
        length: 255
    })
        // @ts-ignore
    name: string;

}