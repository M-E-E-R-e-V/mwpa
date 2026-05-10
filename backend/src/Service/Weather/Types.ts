/**
 * One numeric snapshot of the marine weather at a point — either a day
 * mean or a single hour. Numeric fields are optional because the
 * upstream may report sparse coverage (e.g. SST is missing in some sea
 * areas).
 */
export type WeatherSample = {
    sst_c?: number;
    air_temperature_c?: number;
    /**
     * UV index (dimensionless, 0..11+).
     * For day samples this is the **daily maximum** (UV peak around
     * solar noon), not the day mean — averaging in the nightly zeros
     * would dilute the value into something meaningless.
     * For hour samples it's the exact hourly value.
     */
    uv_index?: number;
    wave_height_m?: number;
    wave_period_s?: number;
    wave_direction_deg?: number;
};

/**
 * Result of a successful weather lookup at a given (lat, lon, date[, hour]).
 *
 * `day` is the mean over all hourly samples for the requested day and
 * is always present when the upstream returned anything at all.
 *
 * `hour` is the exact hourly sample at `hour_used` and is only present
 * when the caller passed a `hour` argument AND the upstream had a
 * matching sample (DST-spring-forward gaps and incomplete coverage can
 * cause the hour sample to be missing while the day mean is fine).
 */
export type WeatherInfo = {

    /**
     * Day-mean snapshot. Always present when the lookup succeeded —
     * downstream consumers (analytics, exports) can rely on this being
     * the canonical "weather at this sighting on that day".
     */
    day: WeatherSample;

    /**
     * Exact hourly snapshot at `hour_used`. Only set when an hour was
     * requested and the upstream provided a matching sample.
     */
    hour?: WeatherSample;

    /**
     * Local-time hour-of-day (0..23) used for the hour sample. Only set
     * together with `hour`.
     */
    hour_used?: number;

    /**
     * Provider id that produced the values (e.g. 'open_meteo_marine').
     */
    provider: string;

    /**
     * Epoch ms when the values were fetched.
     */
    fetched_at: number;

};

/**
 * Weather provider — wraps a single upstream API. Implementations own
 * their own rate limiter and retry policy.
 */
export interface WeatherProvider {

    /**
     * Stable provider id, also stored in WeatherInfo.provider.
     */
    getName(): string;

    /**
     * True if this provider has coverage for the given coordinate.
     */
    supports(latitude: number, longitude: number): boolean;

    /**
     * Fetch weather metadata for (latitude, longitude) on the given day
     * (YYYY-MM-DD). When `hour` is provided (0–23, local time at the
     * point), the implementation tries to also include that exact
     * hourly sample in `WeatherInfo.hour`. The day mean is always
     * computed regardless. Returns null if the upstream has no values
     * at all for the point/day, or throws on network/HTTP errors.
     */
    getWeather(
        latitude: number,
        longitude: number,
        isoDate: string,
        hour?: number
    ): Promise<WeatherInfo | null>;

}