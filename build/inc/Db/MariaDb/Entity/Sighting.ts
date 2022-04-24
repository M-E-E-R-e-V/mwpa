import {BaseEntity, Column, Entity, Index, PrimaryGeneratedColumn} from 'typeorm';

/**
 * Sighting
 */
@Entity({name: 'sighting'})
export class Sighting extends BaseEntity {

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
     * sighting tour id
     */
    @Index()
    @Column({
        default: 0
    })
        // @ts-ignore
    sighting_tour_id: number;

    /**
     * sigthing datetime (day and time)
     */
    @Index()
    @Column({
        default: 0
    })
        // @ts-ignore
    sigthing_datetime: number;

    /**
     * sighting schema id
     */
    @Index()
    @Column({
        default: 0
    })
        // @ts-ignore
    sighting_schema_id: number;

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
     * individual count
     */
    @Index()
    @Column({
        default: 0
    })
        // @ts-ignore
    individual_count: number;

    /**
     * behavioural states id
     */
    @Index()
    @Column({
        default: 0
    })
        // @ts-ignore
    behavioural_states_id: number;

    /**
     * observer
     */
    @Index()
    @Column({
        default: ''
    })
        // @ts-ignore
    observer: string;

    /**
     * other vehicle count
     */
    @Index()
    @Column({
        default: 0
    })
        // @ts-ignore
    other_vehicle_count: number;

    /**
     * direction of vehicle
     */
    @Index()
    @Column({
        default: 0
    })
        // @ts-ignore
    direction_id: number;

    /**
     * swell id
     */
    @Index()
    @Column({
        default: 0
    })
        // @ts-ignore
    swell_id: number;

    /**
     * encounter categorie id
     */
    @Index()
    @Column({
        default: 0
    })
        // @ts-ignore
    encounter_categorie_id: number;

    /**
     * location latitude
     */
    @Index()
    @Column({
        default: 0.0,
        type: 'float'
    })
        // @ts-ignore
    location_lat: number;

    /**
     * location longitude
     */
    @Index()
    @Column({
        default: 0.0,
        type: 'float'
    })
        // @ts-ignore
    location_lon: number;

    /**
     * location gps coordinates n
     */
    @Column({
        default: ''
    })
        // @ts-ignore
    location_gps_n: string;

    /**
     * location gps coordinates
     */
    @Column({
        default: ''
    })
        // @ts-ignore
    location_gps_w: string;

    /**
     * notes
     */
    @Column({
        type: 'text',
        default: ''
    })
        // @ts-ignore
    notes: string;

    /**
     * exist images
     */
    @Index()
    @Column({
        type: 'int',
        default: false
    })
        // @ts-ignore
    exist_images: boolean;

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

}