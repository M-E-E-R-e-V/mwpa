import {BaseEntity, Column, Entity, Index, PrimaryGeneratedColumn} from 'typeorm';

/**
 * SightingTour
 * all sigthings are assigned to a tour
 */
@Entity({name: 'sighting_tour'})
export class SightingTour extends BaseEntity {

    /**
     * id for sighting tour
     */
    @PrimaryGeneratedColumn()
        // @ts-ignore
    id: number;

    @Index()
    @Column()
        // @ts-ignore
    tour_fid: string;

    /**
     * user create this entry
     */
    @Index()
    @Column()
        // @ts-ignore
    creater_id: number;

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
     * update datetime
     */
    @Index()
    @Column({
        default: 0
    })
        // @ts-ignore
    update_datetime: number;

    /**
     * vehicle id
     */
    @Index()
    @Column()
        // @ts-ignore
    vehicle_id: number;

    /**
     * vehicle driver
     */
    @Index()
    @Column()
        // @ts-ignore
    vehicle_driver_id: number;

    /**
     * beaufort wind
     */
    @Index()
    @Column({
        default: ''
    })
        // @ts-ignore
    beaufort_wind: string;

    /**
     * date
     */
    @Column()
        // @ts-ignore
    date: string;

    @Column()
        // @ts-ignore
    tour_start: string;

    @Column()
        // @ts-ignore
    tour_end: string;

    /**
     * tour by organization
     */
    @Index()
    @Column({
        default: 0
    })
        // @ts-ignore
    organization_id: number;

    /**
     * open = 1,
     * close = 2
     */
    @Index()
    @Column({
        default: 0
    })
        // @ts-ignore
    status: number;

    /**
     * json list with person names of the boat
     * that can't be a user
     */
    @Column({
        default: ''
    })
        // @ts-ignore
    record_by_persons: string;

}