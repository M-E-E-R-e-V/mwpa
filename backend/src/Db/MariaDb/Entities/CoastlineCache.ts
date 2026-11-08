import {DBBaseEntityId} from '@stefanwerfling/figtree';
import {Column, Entity, Index} from 'typeorm';

/**
 * Coast lines of an area for /mobile/coastline (OpenStreetMap
 * natural=coastline, ODbL), loaded once from an Overpass server and kept
 * here. One row per area: the home area of an organization ("org:<id>:<box>")
 * or a grid cell for devices of an organization without home area
 * ("cell:<lat>:<lon>").
 */
@Entity({name: 'coastline_cache'})
export class CoastlineCache extends DBBaseEntityId {

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
     * JSON number[][]: one flat [lat, lon, ...] list per line.
     */
    @Column({
        type: 'longtext',
        nullable: true
    })
    public lines!: string | null;

    @Column({default: 0})
    public point_count!: number;

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
