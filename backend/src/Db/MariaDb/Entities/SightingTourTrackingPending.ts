import {DBBaseEntityUnid} from 'figtree';
import {Column, Entity, Index} from 'typeorm';

/**
 * SightingTourTrackingPending
 *
 * Holds tracking points uploaded by the mobile sync before the parent
 * `SightingTour` exists on the server. The mobile V1 protocol creates a
 * tour only as a side effect of saving a sighting, so tracking points
 * that arrive first (or for a tour-fid that never receives a sighting)
 * would otherwise be dropped silently.
 *
 * Rows are promoted into `sighting_tour_tracking` and deleted from here
 * when a sighting with the matching tour_fid is saved for the same
 * device (see Mobile/Sightings/Save.ts).
 */
@Entity({name: 'sighting_tour_tracking_pending'})
export class SightingTourTrackingPending extends DBBaseEntityUnid {

    /**
     * tour_fid this pending track belongs to
     */
    @Index()
    @Column()
    public tour_fid!: string;

    /**
     * device that uploaded this pending track
     */
    @Index()
    @Column({
        default: 0
    })
    public device_id!: number;

    /**
     * original tracking timestamp (seconds since epoch, derived from
     * the client's `date` field on upload)
     */
    @Column({
        default: 0
    })
    public create_datetime!: number;

    /**
     * serialised position payload (same format as
     * `SightingTourTracking.position`)
     */
    @Column({
        type: 'text',
        default: ''
    })
    public position!: string;

    /**
     * when this row was placed into the bucket (seconds since epoch).
     * Useful for evicting orphans that never receive a sighting.
     */
    @Index()
    @Column({
        default: 0
    })
    public pending_since!: number;

}