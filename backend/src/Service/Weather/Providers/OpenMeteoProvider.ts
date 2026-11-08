import {Logger} from '@stefanwerfling/figtree';
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
    wind_speed_10m?: (number | null)[];
    wind_direction_10m?: (number | null)[];
    wind_gusts_10m?: (number | null)[];
};

type OpenMeteoForecastResponse = {
    hourly?: OpenMeteoForecastHourly;
};

/** How a metric's hourly series is reduced to the day value. */
type MetricReduce = 'mean' | 'max' | 'dir';

/** Rounding applied to a metric value: fractional digits, or 'int'. */
type MetricRound = number | 'int';

/**
 * Declarative mapping of one Open-Meteo hourly series onto a WeatherSample
 * field. `get` picks the series from the hourly block `H` (type-safe, no
 * casts), `reduce` is used for the day summary (the hour sample always picks the
 * exact index) and `round` is applied to the resulting value.
 */
type WeatherMetric<H> = {
    get: (hourly: H) => (number | null)[] | undefined;
    field: keyof WeatherSample;
    reduce: MetricReduce;
    round: MetricRound;
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
     * Marine hourly series → WeatherSample fields (waves + SST).
     * @private
     */
    private static readonly _MARINE_METRICS: WeatherMetric<OpenMeteoMarineHourly>[] = [
        {get: (h): (number | null)[] | undefined => h.sea_surface_temperature, field: 'sst_c', reduce: 'mean', round: 1},
        {get: (h): (number | null)[] | undefined => h.wave_height, field: 'wave_height_m', reduce: 'mean', round: 2},
        {get: (h): (number | null)[] | undefined => h.wave_period, field: 'wave_period_s', reduce: 'mean', round: 1},
        {get: (h): (number | null)[] | undefined => h.wave_direction, field: 'wave_direction_deg', reduce: 'dir', round: 'int'}
    ];

    /**
     * Forecast/archive hourly series → WeatherSample fields (air temp, UV, wind).
     * UV and gusts use the day MAX (peak), everything else the mean.
     * @private
     */
    private static readonly _AIR_METRICS: WeatherMetric<OpenMeteoForecastHourly>[] = [
        {get: (h): (number | null)[] | undefined => h.temperature_2m, field: 'air_temperature_c', reduce: 'mean', round: 1},
        {get: (h): (number | null)[] | undefined => h.uv_index, field: 'uv_index', reduce: 'max', round: 1},
        {get: (h): (number | null)[] | undefined => h.wind_speed_10m, field: 'wind_speed_m_s', reduce: 'mean', round: 2},
        {get: (h): (number | null)[] | undefined => h.wind_direction_10m, field: 'wind_direction_deg', reduce: 'dir', round: 'int'},
        {get: (h): (number | null)[] | undefined => h.wind_gusts_10m, field: 'wind_gusts_m_s', reduce: 'max', round: 2}
    ];

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
            OpenMeteoProvider._applyDay(day, marineHourly, OpenMeteoProvider._MARINE_METRICS);
        }

        if (airTemp !== null) {
            times ??= airTemp.time;
            OpenMeteoProvider._applyDay(day, airTemp, OpenMeteoProvider._AIR_METRICS);
        }

        const idx = OpenMeteoProvider._findHourIndex(times, hour);

        if (idx !== null) {
            if (marineHourly !== null) {
                OpenMeteoProvider._applyHour(hourSample, marineHourly, idx, OpenMeteoProvider._MARINE_METRICS);
            }

            if (airTemp !== null) {
                OpenMeteoProvider._applyHour(hourSample, airTemp, idx, OpenMeteoProvider._AIR_METRICS);
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
        } catch (e) {
            Logger.getLogger().warn(`OpenMeteoProvider: failed to parse marine response — ${(e as Error).message}`);
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
            hourly: 'temperature_2m,uv_index,wind_speed_10m,wind_direction_10m,wind_gusts_10m',
            wind_speed_unit: 'ms',
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
        } catch (e) {
            Logger.getLogger().warn(`OpenMeteoProvider: failed to parse forecast response — ${(e as Error).message}`);
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
            && sample.wave_direction_deg === undefined
            && sample.wind_speed_m_s === undefined
            && sample.wind_direction_deg === undefined
            && sample.wind_gusts_m_s === undefined;
    }

    /**
     * Round x to `digits` fractional places.
     * @private
     */
    private static _round(x: number, digits: number): number {
        const factor = 10 ** digits;
        return Math.round(x * factor) / factor;
    }

    /**
     * Reduce an hourly series to its day value per the metric's reducer.
     * @private
     */
    private static _reduce(xs: (number | null)[] | undefined, kind: MetricReduce): number | null {
        if (kind === 'max') {
            return OpenMeteoProvider._max(xs);
        }

        if (kind === 'dir') {
            return OpenMeteoProvider._meanDirection(xs);
        }

        return OpenMeteoProvider._mean(xs);
    }

    /**
     * Assign `raw` (rounded per the metric) to `sample[field]`, skipping null.
     * @private
     */
    private static _assign(sample: WeatherSample, field: keyof WeatherSample, raw: number | null, round: MetricRound): void {
        if (raw === null) {
            return;
        }

        sample[field] = round === 'int' ? Math.round(raw) : OpenMeteoProvider._round(raw, round);
    }

    /**
     * Fill `sample` with the DAY summary of each metric (reduced series).
     * @private
     */
    private static _applyDay<H>(sample: WeatherSample, hourly: H, metrics: WeatherMetric<H>[]): void {
        for (const m of metrics) {
            OpenMeteoProvider._assign(sample, m.field, OpenMeteoProvider._reduce(m.get(hourly), m.reduce), m.round);
        }
    }

    /**
     * Fill `sample` with each metric's value at hourly index `idx`.
     * @private
     */
    private static _applyHour<H>(sample: WeatherSample, hourly: H, idx: number, metrics: WeatherMetric<H>[]): void {
        for (const m of metrics) {
            OpenMeteoProvider._assign(sample, m.field, OpenMeteoProvider._at(m.get(hourly), idx), m.round);
        }
    }

}