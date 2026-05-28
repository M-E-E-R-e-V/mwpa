import {httpGetWithRetry} from '../../Common/HttpGet.js';
import {RateLimiter} from '../../Common/RateLimiter.js';
import {WeatherInfo, WeatherProvider, WeatherSample} from '../Types.js';

/**
 * Read the UV value at a specific hour out of NASA POWER's hourly
 * object. Keys are `YYYYMMDDHH` (UTC). Returns null when the key is
 * missing, the value is the FILL_VALUE sentinel, or anything else
 * non-numeric.
 */
type NasaPowerHourly = Record<string, number>;

/**
 * Subset of the NASA POWER hourly-point response shape we care about.
 */
type NasaPowerHourlyResponse = {
    properties?: {
        parameter?: {
            ALLSKY_SFC_UV_INDEX?: Record<string, number>;
        };
    };
};

/**
 * NASA POWER provider — historical UV index. Fills the gap left by
 * Open-Meteo, whose ERA5-backed Archive endpoint returns null for
 * UV (ERA5 has no UV variable). NASA POWER's `ALLSKY_SFC_UV_INDEX`
 * is derived from the SYN1deg satellite-cloud product and goes back
 * to 1981 with global coverage and ~2-day latency (advertised — the
 * real latency is several months for some grid cells, see
 * WeatherService's short-cycle retry for the catch-up).
 *
 * We use the hourly endpoint, not the daily one, for two reasons:
 *
 *   1. Day max around solar noon matches Open-Meteo's `uv_index_day`
 *      semantic — NASA's daily endpoint reports the day mean which
 *      gets diluted by night-time zeros.
 *   2. The same response also lets us pull the exact hourly value at
 *      the sighting's `duration_from`, populating `uv_index_hour` —
 *      that column was 100% NULL before this hour-aware path landed.
 *
 * No API key required, no documented rate limit — we self-throttle
 * at 2 s/call to stay polite.
 *
 * Only provides UV; SST / waves / air temperature come from
 * Open-Meteo. The registry merges the two upstreams field-by-field.
 *
 * @see https://power.larc.nasa.gov/docs/services/api/temporal/hourly/
 */
export class NasaPowerProvider implements WeatherProvider {

    /**
     * Stable provider id stored in WeatherInfo.provider /
     * provider_per_field.
     */
    public static readonly NAME = 'nasa_power';

    /**
     * NASA POWER's "missing value" sentinel — see API docs. Treat as
     * null on read.
     * @private
     */
    private static readonly FILL_VALUE = -999;

    /**
     * Hourly endpoint. The daily endpoint exists too but returns day
     * MEAN UV — we want the peak around solar noon to match the
     * existing `uv_index_day` semantic on Open-Meteo's forecast path.
     * @private
     */
    private static readonly URL_BASE = 'https://power.larc.nasa.gov/api/temporal/hourly/point';

    /**
     * 2 s min interval between calls. NASA POWER doesn't publish a
     * rate limit; this stays well inside any reasonable threshold for
     * a free service and matches the ~30-sightings/cron-tick budget.
     * @private
     */
    private readonly _limiter = new RateLimiter(2000);

    public getName(): string {
        return NasaPowerProvider.NAME;
    }

    public supports(): boolean {
        return true;
    }

    public async getWeather(
        latitude: number,
        longitude: number,
        isoDate: string,
        hour?: number
    ): Promise<WeatherInfo | null> {
        const ymd = isoDate.replace(/-/gu, '');

        const params = new URLSearchParams({
            parameters: 'ALLSKY_SFC_UV_INDEX',
            community: 'AG',
            latitude: `${latitude}`,
            longitude: `${longitude}`,
            start: ymd,
            end: ymd,
            format: 'JSON'
        });

        const url = `${NasaPowerProvider.URL_BASE}?${params.toString()}`;
        const response = await this._limiter.schedule(async() => httpGetWithRetry(url));

        if (response.status !== 200) {
            return null;
        }

        let parsed: NasaPowerHourlyResponse;
        try {
            parsed = JSON.parse(response.body) as NasaPowerHourlyResponse;
        } catch {
            return null;
        }

        const hourly = parsed.properties?.parameter?.ALLSKY_SFC_UV_INDEX;
        if (!hourly) {
            return null;
        }

        // Day max — sentinel-aware. Same logic as before.
        let max: number | null = null;
        for (const value of Object.values(hourly)) {
            if (NasaPowerProvider._isValidUv(value) && (max === null || value > max)) {
                max = value;
            }
        }

        // Hour value — pull the requested hour out of the same response.
        // NASA POWER uses UTC for the key timestamps; the OpenMeteo path
        // hits a different host with `timezone=auto` so its hours are
        // local. We accept the UTC↔local skew for the few La-Gomera-ish
        // sightings where NASA POWER is the only UV source — the marker
        // in provenance lets analysts see which provider supplied it.
        const hourValue = hour !== undefined
            ? NasaPowerProvider._readHourly(hourly, ymd, hour)
            : null;

        if (max === null && hourValue === null) {
            return null;
        }

        const day: WeatherSample = max !== null
            ? {uv_index: NasaPowerProvider._round(max, 1)}
            : {};

        const result: WeatherInfo = {
            day: day,
            provider: NasaPowerProvider.NAME,
            fetched_at: Date.now()
        };

        if (hourValue !== null && hour !== undefined) {
            result.hour = {uv_index: NasaPowerProvider._round(hourValue, 1)};
            result.hour_used = hour;
        }

        return result;
    }

    /**
     * True when `value` is a real numeric UV reading (not the
     * FILL_VALUE sentinel, not Infinity/NaN, not non-numeric).
     * @private
     */
    private static _isValidUv(value: unknown): value is number {
        return typeof value === 'number'
            && Number.isFinite(value)
            && value !== NasaPowerProvider.FILL_VALUE;
    }

    /**
     * Look up the UV value at `hour` (0..23) out of the hourly object.
     * Returns null when the key is absent or the value is invalid.
     * @private
     */
    private static _readHourly(hourly: NasaPowerHourly, ymd: string, hour: number): number | null {
        const key = `${ymd}${`${hour}`.padStart(2, '0')}`;
        const value = hourly[key];
        return NasaPowerProvider._isValidUv(value) ? value : null;
    }

    /**
     * Round x to `digits` fractional places.
     * @private
     */
    private static _round(x: number, digits: number): number {
        const factor = 10 ** digits;
        return Math.round(x * factor) / factor;
    }

}