import {BaseEntity, Column, Entity, Index, PrimaryGeneratedColumn} from 'typeorm';

/**
 * SightingTourTracking
 */
@Entity({name: 'sighting_tour_tracking'})
export class SightingTourTracking extends BaseEntity {

    @PrimaryGeneratedColumn('uuid')
        // @ts-ignore
    unid: string;

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
     * sighting tour id
     */
    @Index()
    @Column({
        default: 0
    })
        // @ts-ignore
    sighting_tour_id: number;

    @Column({
        type: 'text',
        default: ''
    })
    // @ts-ignore
    position: string;

}