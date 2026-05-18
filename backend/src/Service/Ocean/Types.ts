/**
 * One numeric snapshot of marine biogeochemistry + altimetric
 * sea-state at a point — a day mean (no hour samples in v1, since
 * ERDDAP-backed products are 1×/day satellite composites or coarser).
 *
 * Numeric fields are optional because each upstream covers a different
 * subset and a point may fall in a coverage gap (clouds for satellite
 * chl-a, pre-2015 dates for SMAP salinity, etc.).
 */
export type OceanSample = {
    chl_a_mg_m3?: number;
    salinity_psu?: number;
    sla_cm?: number;
    current_speed_m_s?: number;
    current_direction_deg?: number;
};

/**
 * Result of a successful ocean lookup at a given (lat, lon, date).
 *
 * `day` is the only sample for now — every field originates from
 * daily / multi-day composites. When an hourly provider (HYCOM / CMEMS
 * physics) is added later, mirror WeatherInfo by adding optional
 * `hour` + `hour_used` here and the matching `_hour` columns on
 * SightingExtended.
 */
export type OceanInfo = {

    /**
     * Day-mean snapshot. Always present when the lookup succeeded.
     */
    day: OceanSample;

    /**
     * Provider id that produced the values (e.g. 'erddap').
     */
    provider: string;

    /**
     * Epoch ms when the values were fetched.
     */
    fetched_at: number;

};

/**
 * Ocean provider — wraps one or more upstream APIs covering ocean
 * biogeochemistry and altimetric variables. Implementations own their
 * own rate limiter and retry policy.
 */
export interface OceanProvider {

    /**
     * Stable provider id, also stored in OceanInfo.provider.
     */
    getName(): string;

    /**
     * True if this provider has coverage for the given coordinate.
     */
    supports(latitude: number, longitude: number): boolean;

    /**
     * Fetch ocean metadata for (latitude, longitude) on the given day
     * (YYYY-MM-DD). Returns null if no upstream produced any value at
     * all for the point/day, or throws on network/HTTP errors.
     */
    getOcean(
        latitude: number,
        longitude: number,
        isoDate: string
    ): Promise<OceanInfo | null>;

}