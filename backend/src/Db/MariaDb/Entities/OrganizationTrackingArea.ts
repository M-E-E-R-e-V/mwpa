import {DBBaseEntityId} from 'figtree';
import {Entity, Index, Column} from 'typeorm';

/**
 * Area Types
 */
export enum TrackingAreaType {
    HOME = 'home'
}

@Entity({name: 'organization_tracking_area'})
export class OrganizationTrackingArea extends DBBaseEntityId {

    /**
     * sighting by organization
     */
    @Index()
    @Column({
        default: 0
    })
    public organization_id!: number;

    /**
     * Area type
     */
    @Index()
    @Column({
        type: 'varchar',
        length: '128',
        default: ''
    })
    public area_type!: string;

    /**
     * Geo json str
     */
    @Column({
        type: 'text',
        default: ''
    })
    public geojsonstr!: string;

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

}