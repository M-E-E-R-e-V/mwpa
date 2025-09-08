import {DBBaseEntityId} from 'figtree';
import {Column, Entity, Index} from 'typeorm';

/**
 * VehicleDriver
 */
@Entity({name: 'vehicle_driver'})
export class VehicleDriver extends DBBaseEntityId {

    /**
     * user id
     */
    @Index()
    @Column()
    public user_id!: number;

    /**
     * description
     */
    @Column({
        type: 'text',
        default: ''
    })
    public description!: string;

    /**
     * is deleted
     */
    @Column({
        default: false
    })
    public isdeleted!: boolean;

}