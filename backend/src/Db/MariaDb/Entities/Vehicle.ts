import {DBBaseEntityId} from 'figtree';
import {Column, Entity, Index} from 'typeorm';

/**
 * Vehicle Entity
 */
@Entity({name: 'vehicle'})
export class Vehicle extends DBBaseEntityId {

    /**
     * Description
     */
    @Index()
    @Column({
        type: 'varchar',
        length: 512
    })
    public description!: string;

    /**
     * Organization id
     */
    @Index()
    @Column()
    public organization_id!: number;

    /**
     * is deleted
     */
    @Column({
        default: false
    })
    public isdeleted!: boolean;

    /**
     * Whether the vehicle is currently active in use.
     * Set false to hide it from operational pickers (e.g. tour creation,
     * AROC report boat dropdown) without soft-deleting historical sightings.
     * Defaults to true so the column adds cleanly under synchronize=true.
     */
    @Column({
        default: true
    })
    public in_use!: boolean;

}