import {httpGetWithRetry} from '../../Common/HttpGet.js';
import {RateLimiter} from '../../Common/RateLimiter.js';
import {WeatherInfo, WeatherProvider, WeatherSample} from '../Types.js';

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
 * to 1981 with global coverage and ~2-day latency.
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
        isoDate: string
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

        let max: number | null = null;
        for (const value of Object.values(hourly)) {
            if (
                typeof value === 'number'
                && Number.isFinite(value)
                && value !== NasaPowerProvider.FILL_VALUE
                && (max === null || value > max)
            ) {
                max = value;
            }
        }

        if (max === null) {
            return null;
        }

        const day: WeatherSample = {
            uv_index: NasaPowerProvider._round(max, 1)
        };

        return {
            day: day,
            provider: NasaPowerProvider.NAME,
            fetched_at: Date.now()
        };
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