/**
 * Application-wide constants.
 */
export class Const {

    public static readonly VERSION = '1.0.31';
    public static readonly VERSION_API_MOBILE_LOGIN = '1.0.1';
    public static readonly VERSION_API_MOBILE_SYNC = '1.0.3';
    public static readonly VERSION_API_BACKEND = '1.0.1';

    /**
     * Sightings older than this date are considered "overtime" and the mobile sync
     * may delete them locally instead of updating server-side.
     */
    public static readonly FIX_DELETE_DATE = new Date('2023-10-04');

    /**
     * How long pending tracking points (see SightingTourTrackingPending) wait for
     * a matching sighting before the promotion cron synthesises an empty tour
     * for them. 24 h lets a delayed sighting still promote them normally while
     * making empty/effort-only tours visible the next day.
     */
    public static readonly PENDING_TRACK_PROMOTION_AGE_SEC = 24 * 60 * 60;

}