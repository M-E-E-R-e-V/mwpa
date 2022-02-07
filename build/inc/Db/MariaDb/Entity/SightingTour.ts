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
     * start datetime, when the tour begin
     */
    @Index()
    @Column({
        default: 0
    })
        // @ts-ignore
    start_date: number;

    /**
     * end datetime, when the tour stopt
     */
    @Index()
    @Column({
        default: 0
    })
        // @ts-ignore
    end_date: number;

    /**
     * driver id of vehicle (optional)
     */
    @Index()
    @Column({
        default: 0
    })
        // @ts-ignore
    vehicle_driver_id: number;

    /**
     * vehicle id (optional)
     */
    @Index()
    @Column({
        default: 0
    })
        // @ts-ignore
    vehicle_id: number;

    /**
     * tour by organization
     */
    @Index()
    @Column()
        // @ts-ignore
    organization_id: number;

}