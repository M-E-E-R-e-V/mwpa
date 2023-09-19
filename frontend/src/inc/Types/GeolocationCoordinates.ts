
export type GeolocationCoordinates = {

    /**
     * A positive double representing the accuracy, with a 95% confidence level, of the
     * GeolocationCoordinates.latitude and GeolocationCoordinates.longitude properties expressed in meters.
     * @member {number}
     */
    accuracy?: number;

    /**
     * A double representing the altitude of the position in meters above the WGS84 ellipsoid.
     * @member {number}
     */
    altitude?: number;

    /**
     * A positive double representing the accuracy, with a 95% confidence level, of the altitude expressed in meters.
     * @member {number|null}
     */
    altitudeAccuracy?: number|null;

    /**
     * A double representing the direction in which the device is traveling.
     * @member {number|null}
     */
    heading?: number|null;

    /**
     * A double representing the latitude of the position in decimal degrees.
     * @member {number}
     */
    latitude?: number;

    /**
     * The value in longitude is the geographical longitude of the location on Earth described by the
     * Coordinates object, in decimal degrees. The value is defined by the World Geodetic
     * System 1984 specification (WGS 84).
     * @member {number}
     */
    longitude?: number;

    /**
     * A double representing the velocity of the device in meters per second.
     * @member {number|null}
     */
    speed?: number|null;

    /**
     * A timestamp for created the location.
     * @member {number}
     */
    timestamp?: number;

    /**
     * @member {number|null}
     */
    floor?: number|null;

    /**
     * @member {number}
     */
    speed_accuracy?: number;

    /**
     * @member {boolean}
     */
    is_mocked?: boolean;

};