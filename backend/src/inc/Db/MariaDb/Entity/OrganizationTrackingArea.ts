import {BaseEntity, Entity, PrimaryGeneratedColumn, Index, Column} from 'typeorm';

/**
 * Area Types
 */
export enum TrackingAreaType {
    HOME = 'home'
}

@Entity({name: 'organization_tracking_area'})
export class OrganizationTrackingArea extends BaseEntity {

    @PrimaryGeneratedColumn()
    public id!: number;

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
        type: 'varchar',
        length: '128',
        default: ''
    })
    public area_type!: string;

    @Column({
        type: 'text',
        default: ''
    })
    public geojsonstr!: string;

}