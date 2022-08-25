import {BaseEntity, Column, Entity, Index, PrimaryGeneratedColumn} from 'typeorm';

/**
 * Devices
 */
@Entity({name: 'devices'})
export class Devices extends BaseEntity {

    @PrimaryGeneratedColumn()
        // @ts-ignore
    id: number;

    @Column({
        type: 'varchar',
        length: 128
    })
        // @ts-ignore
    identity: string;

    @Index()
    @Column()
        // @ts-ignore
    user_id: number;

    @Column({
        type: 'text',
        default: ''
    })
        // @ts-ignore
    description: string;

    /**
     * create datetime
     */
    @Index()
    @Column({
        default: 0
    })
        // @ts-ignore
    create_datetime: number;

    /**
     * update_datetime
     */
    @Index()
    @Column({
        default: 0
    })
        // @ts-ignore
    update_datetime: number;

}