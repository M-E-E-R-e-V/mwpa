import {BaseEntity, Column, Entity, Index, PrimaryGeneratedColumn} from 'typeorm';

/**
 * Sighting
 */
@Entity({name: 'sighting'})
export class Sighting extends BaseEntity {

    @PrimaryGeneratedColumn()
        // @ts-ignore
    id: number;

    @Index()
    @Column()
        // @ts-ignore
    unid: string;

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

    @Index()
    @Column({
        default: 0
    })
        // @ts-ignore
    device_id: number;

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
        default: 0
    })
        // @ts-ignore
    beaufort_wind: number;

    /**
     * date
     */
    @Column()
        // @ts-ignore
    date: string;

    /**
     * sighting tour id
     */
    @Index()
    @Column({
        default: 0
    })
        // @ts-ignore
    tour_id: number;

    @Index()
    @Column()
        // @ts-ignore
    tour_fid: string;

    @Column()
        // @ts-ignore
    tour_start: string;

    @Column()
        // @ts-ignore
    tour_end: string;

    @Column()
        // @ts-ignore
    duration_from: string;

    @Column()
        // @ts-ignore
    duration_until: string;

    @Column({
        type: 'text'
    })
        // @ts-ignore
    location_begin: string;

    @Column({
        type: 'text'
    })
        // @ts-ignore
    location_end: string;

    @Column({
        default: 0
    })
        // @ts-ignore
    photo_taken: number;

    @Column()
        // @ts-ignore
    distance_coast: string;

    @Column({
        default: 0
    })
        // @ts-ignore
    distance_coast_estimation_gps: number;

    /**
     * species id
     */
    @Index()
    @Column({
        default: 0
    })
        // @ts-ignore
    species_id: number;

    /**
     * species count
     */
    @Index()
    @Column({
        default: 0
    })
        // @ts-ignore
    species_count: number;

    @Column({
        default: 0
    })
        // @ts-ignore
    juveniles: number;

    @Column({
        default: 0
    })
        // @ts-ignore
    calves: number;

    @Column({
        default: 0
    })
        // @ts-ignore
    newborns: number;

    @Column({
        default: ''
    })
        // @ts-ignore
    behaviours: string;

    @Column({
        default: 0
    })
        // @ts-ignore
    subgroups: number;

    @Column({
        default: 0
    })
        // @ts-ignore
    group_structure_id: number;

    @Index()
    @Column()
        // @ts-ignore
    reaction_id: number;

    @Column({
        type: 'text',
        default: ''
    })
        // @ts-ignore
    freq_behaviour: string;

    @Column({
        type: 'text',
        default: ''
    })
        // @ts-ignore
    recognizable_animals: string;

    @Column({
        type: 'text',
        default: ''
    })
        // @ts-ignore
    other_species: string;

    @Column({
        type: 'text',
        default: ''
    })
        // @ts-ignore
    other: string;

    @Column({
        type: 'text',
        default: ''
    })
        // @ts-ignore
    other_vehicle: string;

    @Column({
        type: 'text',
        default: ''
    })
        // @ts-ignore
    note: string;

    @Index()
    @Column({
        type: 'varchar',
        length: 128,
        default: ''
    })
        // @ts-ignore
    hash: string;

    @Column()
    // @ts-ignore
    hash_import_count: number;

    @Column({
        type: 'varchar',
        length: 256,
        default: ''
    })
        // @ts-ignore
    source_import_file: string;

    /**
     * sighting by organization
     */
    @Index()
    @Column({
        default: 0
    })
        // @ts-ignore
    organization_id: number;

}