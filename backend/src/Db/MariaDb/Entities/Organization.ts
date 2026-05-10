import {DBBaseEntityId} from 'figtree';
import {Column, Entity} from 'typeorm';

/**
 * Organization
 */
@Entity({name: 'organization'})
export class Organization extends DBBaseEntityId {

    /**
     * Country
     */
    @Column({
        type: 'varchar',
        length: '128',
        default: ''
    })
    public country!: string;

    /**
     * Location
     */
    @Column({
        type: 'varchar',
        length: '255',
        default: ''
    })
    public location!: string;

    /**
     * Latitude
     */
    @Column({
        type: 'varchar',
        length: '255',
        default: ''
    })
    public lat!: string;

    /**
     * Longitude
     */
    @Column({
        type: 'varchar',
        length: '255',
        default: ''
    })
    public lon!: string;

    /**
     * Description
     */
    @Column({
        type: 'text',
        default: ''
    })
    public description!: string;

    /**
     * Provincia of the company seat — feeds AROC datos GENERALES.
     */
    @Column({
        type: 'varchar',
        length: 128,
        default: ''
    })
    public province!: string;

    /**
     * Isla — feeds AROC datos GENERALES.
     */
    @Column({
        type: 'varchar',
        length: 128,
        default: ''
    })
    public island!: string;

    /**
     * Puerto — feeds AROC datos GENERALES.
     */
    @Column({
        type: 'varchar',
        length: 128,
        default: ''
    })
    public port!: string;

    /**
     * Contact e-mail of the company — AROC datos GENERALES.
     */
    @Column({
        type: 'varchar',
        length: 255,
        default: ''
    })
    public email!: string;

    /**
     * Public web address of the company — AROC datos GENERALES.
     */
    @Column({
        type: 'varchar',
        length: 255,
        default: ''
    })
    public web!: string;

    /**
     * AROC authorization reference (Referencia).
     */
    @Column({
        type: 'varchar',
        length: 128,
        default: ''
    })
    public aroc_reference!: string;

    /**
     * AROC region code (CAN/RES/AND).
     */
    @Column({
        type: 'varchar',
        length: 16,
        default: ''
    })
    public aroc_region!: string;

    /**
     * AROC authorization number (Número).
     */
    @Column({
        type: 'varchar',
        length: 64,
        default: ''
    })
    public aroc_number!: string;

    /**
     * Year of the AROC authorization. 0 = unset.
     */
    @Column({
        type: 'int',
        default: 0
    })
    public aroc_year!: number;

    /**
     * Number of authorized boats under the AROC reference. 0 = unset.
     */
    @Column({
        type: 'int',
        default: 0
    })
    public aroc_authorized_boats!: number;

}