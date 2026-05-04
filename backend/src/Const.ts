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

}