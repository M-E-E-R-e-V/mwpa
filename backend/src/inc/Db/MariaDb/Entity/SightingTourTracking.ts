import {BaseEntity, Column, Entity, Index, PrimaryGeneratedColumn} from 'typeorm';

/**
 * SightingTourTracking
 */
@Entity({name: 'sighting_tour_tracking'})
export class SightingTourTracking extends BaseEntity {

    @PrimaryGeneratedColumn('uuid')
    public unid!: string;

    /**
     * create datetime
     */
    @Index()
    @Column({
        default: 0
    })
    public create_datetime!: number;

    /**
     * sighting tour id
     */
    @Index()
    @Column({
        default: 0
    })
    public sighting_tour_id!: number;

    @Column({
        type: 'text',
        default: ''
    })
    public position!: string;

}