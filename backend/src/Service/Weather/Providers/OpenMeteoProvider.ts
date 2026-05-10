import {httpGetWithRetry} from '../../Common/HttpGet.js';
import {RateLimiter} from '../../Common/RateLimiter.js';
import {WeatherInfo, WeatherProvider, WeatherSample} from '../Types.js';

type OpenMeteoMarineHourly = {
    time?: string[];
    sea_surface_temperature?: (number | null)[];
    wave_height?: (number | null)[];
    wave_period?: (number | null)[];
    wave_direction?: (number | null)[];
};

type OpenMeteoMarineResponse = {
    hourly?: OpenMeteoMarineHourly;
};

type OpenMeteoForecastHourly = {
    time?: string[];
    temperature_2m?: (number | null)[];
    uv_index?: (number | null)[];
};

type OpenMeteoForecastResponse = {
    hourly?: OpenMeteoForecastHourly;
};

/**
 * Open-Meteo provider — global wave + SST + air-temperature coverage,
 * backed by ERA5 reanalysis (historical) and forecast models.
 *
 * One sighting requires TWO HTTP calls:
 *
 *   1. Marine API (`marine-api.open-meteo.com`) → wave_height,
 *      wave_period, wave_direction, sea_surface_temperature
 *   2. Forecast or Archive API (`api.open-meteo.com` /
 *      `archive-api.open-meteo.com`) → temperature_2m (air, 2 m above
 *      sea level) + uv_index. The Forecast endpoint covers the recent
 *      ~3 months including today; the Archive endpoint covers
 *      everything older (ERA5 from 1940). Picked based on the
 *      requested date so we always get a value.
 *
 * Both calls are issued through the same RateLimiter, so they
 * automatically space out — at 1.2 s per call that's ~2.4 s wall time
 * per sighting. Open-Meteo's quota is global across endpoints (~10k
 * req/day free), so 30 sightings/cron-tick × 2 calls = 60 calls/tick =
 * 720 calls/hour worst case, comfortably under the limit.
 *
 * The query uses `timezone=auto` so hourly indices are LOCAL time at
 * the point — see {@link _findHourIndex}.
 *
 * No API key required, free for non-commercial use.
 *
 * @see https://open-meteo.com/en/docs/marine-weather-api
 * @see https://open-meteo.com/en/docs           (forecast)
 * @see https://open-meteo.com/en/docs/historical-weather-api
 */
export class OpenMeteoProvider implements WeatherProvider {

    /**
     * Stable provider id stored in WeatherInfo.provider.
     */
    public static readonly NAME = 'open_meteo';

    /**
     * Cutoff in days: dates older than (today - this) use the Archive
     * API; newer ones use the Forecast API. The Archive endpoint has
     * a ~5-day lag behind real time, the Forecast endpoint covers
     * roughly the last 3 months — 6 days is a safe meeting point.
     * @private
     */
    private static readonly ARCHIVE_CUTOFF_DAYS = 6;

    /**
     * Shared limiter for both endpoints — Open-Meteo's quota is
     * cross-endpoint, so we pace all calls together. 1.2 s min interval
     * → ~50 req/min total.
     * @private
     */
    private readonly _limiter = new RateLimiter(1200);

    public getName(): string {
        return OpenMeteoProvider.NAME;
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
        const marineHourly = await this._fetchMarine(latitude, longitude, isoDate);
        const airTemp = await this._fetchAirTemperature(latitude, longitude, isoDate);

        if (marineHourly === null && airTemp === null) {
            return null;
        }

        const day: WeatherSample = {};
        const hourSample: WeatherSample = {};
        let times: string[] | undefined;

        if (marineHourly !== null) {
            times = marineHourly.time;
            const sst = OpenMeteoProvider._mean(marineHourly.sea_surface_temperature);

            if (sst !== null) {
                day.sst_c = OpenMeteoProvider._round(sst, 1);
            }

            const height = OpenMeteoProvider._mean(marineHourly.wave_height);

            if (height !== null) {
                day.wave_height_m = OpenMeteoProvider._round(height, 2);
            }

            const period = OpenMeteoProvider._mean(marineHourly.wave_period);

            if (period !== null) {
                day.wave_period_s = OpenMeteoProvider._round(period, 1);
            }

            const direction = OpenMeteoProvider._meanDirection(marineHourly.wave_direction);

            if (direction !== null) {
                day.wave_direction_deg = Math.round(direction);
            }
        }

        if (airTemp !== null) {
            times ??= airTemp.time;
            const air = OpenMeteoProvider._mean(airTemp.temperature_2m);

            if (air !== null) {
                day.air_temperature_c = OpenMeteoProvider._round(air, 1);
            }

            // UV is 0 at night — the day MAX (peak around solar noon) is
            // the meaningful summary, not the mean.
            const uvMax = OpenMeteoProvider._max(airTemp.uv_index);

            if (uvMax !== null) {
                day.uv_index = OpenMeteoProvider._round(uvMax, 1);
            }
        }

        const idx = OpenMeteoProvider._findHourIndex(times, hour);

        if (idx !== null) {
            if (marineHourly !== null) {
                const sst = OpenMeteoProvider._at(marineHourly.sea_surface_temperature, idx);

                if (sst !== null) {
                    hourSample.sst_c = OpenMeteoProvider._round(sst, 1);
                }

                const height = OpenMeteoProvider._at(marineHourly.wave_height, idx);

                if (height !== null) {
                    hourSample.wave_height_m = OpenMeteoProvider._round(height, 2);
                }

                const period = OpenMeteoProvider._at(marineHourly.wave_period, idx);

                if (period !== null) {
                    hourSample.wave_period_s = OpenMeteoProvider._round(period, 1);
                }

                const direction = OpenMeteoProvider._at(marineHourly.wave_direction, idx);

                if (direction !== null) {
                    hourSample.wave_direction_deg = Math.round(direction);
                }
            }

            if (airTemp !== null) {
                const air = OpenMeteoProvider._at(airTemp.temperature_2m, idx);

                if (air !== null) {
                    hourSample.air_temperature_c = OpenMeteoProvider._round(air, 1);
                }

                const uv = OpenMeteoProvider._at(airTemp.uv_index, idx);

                if (uv !== null) {
                    hourSample.uv_index = OpenMeteoProvider._round(uv, 1);
                }
            }
        }

        if (OpenMeteoProvider._isEmpty(day) && OpenMeteoProvider._isEmpty(hourSample)) {
            return null;
        }

        const result: WeatherInfo = {
            day: day,
            provider: OpenMeteoProvider.NAME,
            fetched_at: Date.now()
        };

        if (!OpenMeteoProvider._isEmpty(hourSample) && hour !== undefined) {
            result.hour = hourSample;
            result.hour_used = hour;
        }

        return result;
    }

    /**
     * Fetch the marine hourly block (waves + SST). Returns null on
     * non-200 / parse error so the caller can still try the forecast
     * call.
     * @private
     */
    private async _fetchMarine(
        latitude: number,
        longitude: number,
        isoDate: string
    ): Promise<OpenMeteoMarineHourly | null> {
        const params = new URLSearchParams({
            latitude: `${latitude}`,
            longitude: `${longitude}`,
            start_date: isoDate,
            end_date: isoDate,
            hourly: 'sea_surface_temperature,wave_height,wave_period,wave_direction',
            timezone: 'auto'
        });

        const url = `https://marine-api.open-meteo.com/v1/marine?${params.toString()}`;
        const response = await this._limiter.schedule(async() => httpGetWithRetry(url));

        if (response.status !== 200) {
            return null;
        }

        try {
            const body = JSON.parse(response.body) as OpenMeteoMarineResponse;
            return body.hourly ?? null;
        } catch {
            return null;
        }
    }

    /**
     * Fetch the air-temperature hourly block from Forecast (recent
     * dates) or Archive (older). Returns null on non-200 / parse error
     * so the caller can still emit a marine-only result.
     * @private
     */
    private async _fetchAirTemperature(
        latitude: number,
        longitude: number,
        isoDate: string
    ): Promise<OpenMeteoForecastHourly | null> {
        const useArchive = OpenMeteoProvider._shouldUseArchive(isoDate);
        const host = useArchive
            ? 'https://archive-api.open-meteo.com/v1/archive'
            : 'https://api.open-meteo.com/v1/forecast';

        const params = new URLSearchParams({
            latitude: `${latitude}`,
            longitude: `${longitude}`,
            start_date: isoDate,
            end_date: isoDate,
            hourly: 'temperature_2m,uv_index',
            timezone: 'auto'
        });

        const url = `${host}?${params.toString()}`;
        const response = await this._limiter.schedule(async() => httpGetWithRetry(url));

        if (response.status !== 200) {
            return null;
        }

        try {
            const body = JSON.parse(response.body) as OpenMeteoForecastResponse;
            return body.hourly ?? null;
        } catch {
            return null;
        }
    }

    /**
     * True when `isoDate` is older than today − ARCHIVE_CUTOFF_DAYS,
     * i.e. solidly inside ERA5's covered range.
     * @private
     */
    private static _shouldUseArchive(isoDate: string): boolean {
        const cutoff = new Date();
        cutoff.setUTCDate(cutoff.getUTCDate() - OpenMeteoProvider.ARCHIVE_CUTOFF_DAYS);
        const cutoffIso = cutoff.toISOString().slice(0, 10);
        return isoDate < cutoffIso;
    }

    /**
     * Locate the index of the upstream hourly sample whose timestamp
     * starts the requested hour. Returns null when hour is undefined,
     * times are missing, or no sample matches (e.g. DST gap, where the
     * 02:xx sample doesn't exist on a spring-forward day).
     * @private
     */
    private static _findHourIndex(times: string[] | undefined, hour: number | undefined): number | null {
        if (hour === undefined || !times) {
            return null;
        }

        const needle = `T${`${hour}`.padStart(2, '0')}:00`;

        for (let i = 0; i < times.length; i++) {
            if (times[i].endsWith(needle)) {
                return i;
            }
        }

        return null;
    }

    /**
     * Read xs[idx] if it's a finite number, else null.
     * @private
     */
    private static _at(xs: (number | null)[] | undefined, idx: number): number | null {
        if (!xs) {
            return null;
        }

        const value = xs[idx];

        if (value === null || value === undefined || !Number.isFinite(value)) {
            return null;
        }

        return value;
    }

    /**
     * Max of the finite numbers in xs, ignoring null/NaN. Returns null
     * if no finite values are present. Used for UV index (peak around
     * solar noon is the meaningful summary, not the day mean).
     * @private
     */
    private static _max(xs: (number | null)[] | undefined): number | null {
        if (!xs) {
            return null;
        }

        let max: number | null = null;

        for (const x of xs) {
            if (x !== null && Number.isFinite(x) && (max === null || x > max)) {
                max = x;
            }
        }

        return max;
    }

    /**
     * Mean of the finite numbers in xs, ignoring null/NaN. Returns null
     * if no finite values are present.
     * @private
     */
    private static _mean(xs: (number | null)[] | undefined): number | null {
        if (!xs) {
            return null;
        }

        let sum = 0;
        let count = 0;

        for (const x of xs) {
            if (x !== null && Number.isFinite(x)) {
                sum += x;
                count += 1;
            }
        }

        return count === 0 ? null : sum / count;
    }

    /**
     * Circular mean (in degrees) of compass directions — averaging
     * 359° and 1° as 0°, not 180°. Treats null/NaN as missing.
     * @private
     */
    private static _meanDirection(xs: (number | null)[] | undefined): number | null {
        if (!xs) {
            return null;
        }

        let sumSin = 0;
        let sumCos = 0;
        let count = 0;

        for (const x of xs) {
            if (x !== null && Number.isFinite(x)) {
                const rad = x * Math.PI / 180;
                sumSin += Math.sin(rad);
                sumCos += Math.cos(rad);
                count += 1;
            }
        }

        if (count === 0) {
            return null;
        }

        const angle = Math.atan2(sumSin / count, sumCos / count) * 180 / Math.PI;
        return (angle + 360) % 360;
    }

    /**
     * True when the sample carries no metric.
     * @private
     */
    private static _isEmpty(sample: WeatherSample): boolean {
        return sample.sst_c === undefined
            && sample.air_temperature_c === undefined
            && sample.uv_index === undefined
            && sample.wave_height_m === undefined
            && sample.wave_period_s === undefined
            && sample.wave_direction_deg === undefined;
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