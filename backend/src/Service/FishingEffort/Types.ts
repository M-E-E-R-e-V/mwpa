/**
 * Result of a fishing-effort lookup for one sighting day, aggregated
 * into the radii defined by the service. Numeric fields are required
 * (a successful lookup always reports at least zero hours); textual
 * fields are optional because they may have no clear winner (no
 * vessels detected at all).
 */
export type FishingEffortSample = {

    /**
     * Total commercial fishing hours inside the smaller radius
     * (~25 km) on the sighting day. 0 = no activity, never null in a
     * successful response.
     */
    fishing_hours_day_25km: number;

    /**
     * Same, larger radius (~50 km).
     */
    fishing_hours_day_50km: number;

    /**
     * Distinct AIS vessel count inside the smaller radius.
     */
    vessel_count_day_25km: number;

    /**
     * Gear type with the most fishing-hours inside the smaller radius
     * (e.g. 'trawlers'). undefined when no vessels matched.
     */
    top_gear_type?: string;

    /**
     * ISO-3 flag-state code with the most fishing-hours inside the
     * smaller radius. undefined when no vessels matched.
     */
    top_flag?: string;

};

/**
 * Result of a successful fishing-effort lookup at (lat, lon, date).
 */
export type FishingEffortInfo = {

    /**
     * Day-aggregate sample. Always present when the lookup succeeded.
     */
    day: FishingEffortSample;

    /**
     * Provider id (e.g. 'gfw'). Stored in
     * `sighting_fishing_effort.provenance`.
     */
    provider: string;

    /**
     * Optional upstream dataset/version tag (e.g.
     * 'public-global-fishing-effort:v3.0'). Recorded in provenance so
     * analytics can audit which upstream release the value came from.
     */
    dataset_version?: string;

    /**
     * Epoch ms when the values were fetched.
     */
    fetched_at: number;

};

/**
 * FishingEffort provider — wraps one upstream API. Implementations own
 * their own rate limiter, retry policy, and authentication.
 *
 * `supports()` is also where authentication-gating happens: a provider
 * that needs a credential it doesn't have should return false so the
 * registry skips it and the service marks the row as 'no_provider'.
 */
export interface FishingEffortProvider {

    /**
     * Stable provider id, also stored in FishingEffortInfo.provider.
     */
    getName(): string;

    /**
     * True if this provider has both coverage AND credentials for the
     * given coordinate.
     */
    supports(latitude: number, longitude: number): boolean;

    /**
     * Fetch fishing-effort aggregates for (latitude, longitude) on the
     * given day (YYYY-MM-DD). Returns null when the upstream confirms
     * no data for the point/day (vs. throwing for transient errors).
     */
    getFishingEffort(
        latitude: number,
        longitude: number,
        isoDate: string
    ): Promise<FishingEffortInfo | null>;

}