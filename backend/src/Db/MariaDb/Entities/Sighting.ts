import {DBBaseEntityId} from 'figtree';
import {Column, Entity, Index} from 'typeorm';

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
export class Sighting extends DBBaseEntityId {

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

    /**
     * Tour fid
     */
    @Index()
    @Column()
    public tour_fid!: string;

    /**
     * Tour start
     */
    @Column()
    public tour_start!: string;

    /**
     * Tour end
     */
    @Column()
    public tour_end!: string;

    /**
     * duration from
     */
    @Column()
    public duration_from!: string;

    /**
     * duration until
     */
    @Column()
    public duration_until!: string;

    /**
     * Location begin
     */
    @Column({
        type: 'text'
    })
    public location_begin!: string;

    /**
     * Location end
     */
    @Column({
        type: 'text'
    })
    public location_end!: string;

    /**
     * photo taken
     */
    @Column({
        default: 0
    })
    public photo_taken!: number;

    /**
     * Distance coast
     */
    @Column()
    public distance_coast!: string;

    /**
     * Distance coast estimation gps
     */
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

    /**
     * juveniles
     */
    @Column({
        default: 0
    })
    public juveniles!: number;

    /**
     * calves
     */
    @Column({
        default: 0
    })
    public calves!: number;

    /**
     * newborns
     */
    @Column({
        default: 0
    })
    public newborns!: number;

    /**
     * behaviours
     */
    @Column({
        default: ''
    })
    public behaviours!: string;

    /**
     * subgroups
     */
    @Column({
        default: 0
    })
    public subgroups!: number;

    /**
     * group structure id
     */
    @Column({
        default: 0
    })
    public group_structure_id!: number;

    /**
     * reaction id
     */
    @Index()
    @Column()
    public reaction_id!: number;

    /**
     * freq behaviour
     */
    @Column({
        type: 'text',
        default: ''
    })
    public freq_behaviour!: string;

    /**
     * recognizable animals
     */
    @Column({
        type: 'text',
        default: ''
    })
    public recognizable_animals!: string;

    /**
     * other species
     */
    @Column({
        type: 'text',
        default: ''
    })
    public other_species!: string;

    /**
     * other
     */
    @Column({
        type: 'text',
        default: ''
    })
    public other!: string;

    /**
     * other vehicle
     */
    @Column({
        type: 'text',
        default: ''
    })
    public other_vehicle!: string;

    /**
     * note
     */
    @Column({
        type: 'text',
        default: ''
    })
    public note!: string;

    /**
     * hash
     */
    @Index()
    @Column({
        type: 'varchar',
        length: 128,
        default: ''
    })
    public hash!: string;

    /**
     * hash import count
     */
    @Column()
    public hash_import_count!: number;

    /**
     * source import file
     */
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

    /**
     * sighting type
     */
    @Index()
    @Column({
        default: 0
    })
    public sighting_type!: number;

    /**
     * deleted
     */
    @Index()
    @Column({
        default: false
    })
    public deleted!: boolean;

    /**
     * deleted description
     */
    @Column({
        type: 'text',
        default: null
    })
    public deletedDescription!: string;

    /**
     * syncblock
     */
    @Index()
    @Column({
        default: false
    })
    public syncblock!: boolean;

}