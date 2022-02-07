import {BaseEntity, Column, Entity, Index, PrimaryGeneratedColumn} from 'typeorm';

/**
 * VehicleDriver
 */
@Entity({name: 'vehicle_driver'})
export class VehicleDriver extends BaseEntity {

    /**
     * id for vehicle driver
     */
    @PrimaryGeneratedColumn()
        // @ts-ignore
    id: number;

    /**
     * user id
     */
    @Index()
    @Column()
        // @ts-ignore
    user_id: number;

    /**
     * description
     */
    @Column({
        type: 'text',
        default: ''
    })
        // @ts-ignore
    description: string;

}