import {DBBaseEntityId} from '@stefanwerfling/figtree';
import {Column, Entity, Index} from 'typeorm';

/**
 * Protected areas (EEA Natura 2000 sites) around the home area of an
 * organization for the sighting map, loaded once from the EEA map service
 * and kept here. One row per area ("org:<id>:<box>").
 */
@Entity({name: 'protected_area_cache'})
export class ProtectedAreaCache extends DBBaseEntityId {

    @Index({unique: true})
    @Column({
        type: 'varchar',
        length: 128
    })
    public area_key!: string;

    @Column({type: 'double', default: 0})
    public south!: number;

    @Column({type: 'double', default: 0})
    public west!: number;

    @Column({type: 'double', default: 0})
    public north!: number;

    @Column({type: 'double', default: 0})
    public east!: number;

    /**
     * 'ok', 'pending' (loading) or 'error'.
     */
    @Column({
        type: 'varchar',
        length: 16,
        default: 'pending'
    })
    public status!: string;

    /**
     * GeoJSON FeatureCollection (EPSG:4326) of the sites.
     */
    @Column({
        type: 'longtext',
        nullable: true
    })
    public geojson!: string | null;

    @Column({default: 0})
    public feature_count!: number;

    @Column({
        type: 'varchar',
        length: 64,
        default: ''
    })
    public source!: string;

    @Column({
        type: 'varchar',
        length: 255,
        default: ''
    })
    public error!: string;

    /**
     * Seconds-epoch of the last successful load, 0 if none yet.
     */
    @Column({default: 0})
    public fetch_datetime!: number;

    /**
     * Seconds-epoch of the last load attempt (successful or not).
     */
    @Column({default: 0})
    public attempt_datetime!: number;

}