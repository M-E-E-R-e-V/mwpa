import {DBBaseEntityId} from 'figtree';
import {Column, Entity, Index} from 'typeorm';

/**
 * SightingTour
 * all sigthings are assigned to a tour
 */
@Entity({name: 'sighting_tour'})
export class SightingTour extends DBBaseEntityId {

    /**
     * Tour fid
     */
    @Index()
    @Column()
    public tour_fid!: string;

    /**
     * user create this entry
     */
    @Index()
    @Column()
    public creater_id!: number;

    /**
     * create datetime
     */
    @Index()
    @Column({
        default: 0
    })
    public create_datetime!: number;

    /**
     * update datetime
     */
    @Index()
    @Column({
        default: 0
    })
    public update_datetime!: number;

    /**
     * vehicle id
     */
    @Index()
    @Column()
    public vehicle_id!: number;

    /**
     * vehicle driver
     */
    @Index()
    @Column()
    public vehicle_driver_id!: number;

    /**
     * beaufort wind
     */
    @Index()
    @Column({
        default: ''
    })
    public beaufort_wind!: string;

    /**
     * date
     */
    @Column()
    public date!: string;

    /**
     * Tour start
     */
    @Column()
    public tour_start!: string;

    /**
     * Tour stop
     */
    @Column()
    public tour_end!: string;

    /**
     * tour by organization
     */
    @Index()
    @Column({
        default: 0
    })
    public organization_id!: number;

    /**
     * open = 1,
     * close = 2
     */
    @Index()
    @Column({
        default: 0
    })
    public status!: number;

    /**
     * json list with person names of the boat
     * that can't be a user
     */
    @Column({
        default: ''
    })
    public record_by_persons!: string;

    /**
     * Device id
     */
    @Index()
    @Column({
        default: 0
    })
    public device_id!: number;

}