import {BaseEntity, Column, Entity, Index, PrimaryGeneratedColumn} from 'typeorm';

export enum SightingType {
    NORMAL = 0,
    SHORT = 1,
    NOTICE = 2,
    FREE = 3
}

/**
 * Sighting
 */
@Entity({
    name: 'sighting'
})
export class Sighting extends BaseEntity {

    @PrimaryGeneratedColumn()
    public id!: number;

    @Index()
    @Column()
    public unid!: string;

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

    @Index()
    @Column({
        default: 0
    })
    public device_id!: number;

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
     * depricated use beaufort_wind_n
     */
    @Index()
    @Column({
        default: 0
    })
    public beaufort_wind!: number;

    /**
     * beaufort wind
     */
    @Index()
    @Column({
        default: ''
    })
    public beaufort_wind_n!: string;

    /**
     * date
     */
    @Column()
    public date!: string;

    /**
     * sighting tour id
     */
    @Index()
    @Column({
        default: 0
    })
    public tour_id!: number;

    @Index()
    @Column()
    public tour_fid!: string;

    @Column()
    public tour_start!: string;

    @Column()
    public tour_end!: string;

    @Column()
    public duration_from!: string;

    @Column()
    public duration_until!: string;

    @Column({
        type: 'text'
    })
    public location_begin!: string;

    @Column({
        type: 'text'
    })
    public location_end!: string;

    @Column({
        default: 0
    })
    public photo_taken!: number;

    @Column()
    public distance_coast!: string;

    @Column({
        default: 0
    })
    public distance_coast_estimation_gps!: number;

    /**
     * species id
     */
    @Index()
    @Column({
        default: 0
    })
    public species_id!: number;

    /**
     * species count
     */
    @Index()
    @Column({
        default: 0
    })
    public species_count!: number;

    @Column({
        default: 0
    })
    public juveniles!: number;

    @Column({
        default: 0
    })
    public calves!: number;

    @Column({
        default: 0
    })
    public newborns!: number;

    @Column({
        default: ''
    })
    public behaviours!: string;

    @Column({
        default: 0
    })
    public subgroups!: number;

    @Column({
        default: 0
    })
    public group_structure_id!: number;

    @Index()
    @Column()
    public reaction_id!: number;

    @Column({
        type: 'text',
        default: ''
    })
    public freq_behaviour!: string;

    @Column({
        type: 'text',
        default: ''
    })
    public recognizable_animals!: string;

    @Column({
        type: 'text',
        default: ''
    })
    public other_species!: string;

    @Column({
        type: 'text',
        default: ''
    })
    public other!: string;

    @Column({
        type: 'text',
        default: ''
    })
    public other_vehicle!: string;

    @Column({
        type: 'text',
        default: ''
    })
    public note!: string;

    @Index()
    @Column({
        type: 'varchar',
        length: 128,
        default: ''
    })
    public hash!: string;

    @Column()
    public hash_import_count!: number;

    @Column({
        type: 'varchar',
        length: 256,
        default: ''
    })
    public source_import_file!: string;

    /**
     * sighting by organization
     */
    @Index()
    @Column({
        default: 0
    })
    public organization_id!: number;

    @Index()
    @Column({
        default: 0
    })
    public sighting_type!: number;

    @Index()
    @Column({
        default: false
    })
    public deleted!: boolean;

    @Column({
        type: 'text',
        default: null
    })
    public deletedDescription!: string;

    @Index()
    @Column({
        default: false
    })
    public syncblock!: boolean;

}