import assert from 'node:assert/strict';
import {describe, it} from 'node:test';
import {OpenMeteoProvider} from '../src/Service/Weather/Providers/OpenMeteoProvider.js';
import {WeatherSample} from '../src/Service/Weather/Types.js';

/*
 * The pure mapping/reduction helpers are `private static`. Surface them through
 * a typed cast (the same approach the frontend LocationPicker test uses for its
 * snap math) so the tests exercise the real production logic without
 * constructing the provider (which would spin up a RateLimiter and make HTTP
 * calls). Importing the class does not touch the logger — it is only reached
 * inside the fetch catch blocks, which these tests never run.
 */
type Series = (number | null)[] | undefined;
type Metric = unknown;
const P = OpenMeteoProvider as unknown as {
    _mean(xs: Series): number | null;
    _max(xs: Series): number | null;
    _meanDirection(xs: Series): number | null;
    _at(xs: Series, idx: number): number | null;
    _round(x: number, digits: number): number;
    _findHourIndex(times: string[] | undefined, hour: number | undefined): number | null;
    _isEmpty(sample: WeatherSample): boolean;
    _applyDay(sample: WeatherSample, hourly: unknown, metrics: Metric): void;
    _applyHour(sample: WeatherSample, hourly: unknown, idx: number, metrics: Metric): void;
    _MARINE_METRICS: Metric;
    _AIR_METRICS: Metric;
};

describe('OpenMeteoProvider reducers', () => {

    it('_mean ignores null/NaN and returns null when empty', () => {
        assert.equal(P._mean([2, null, 4]), 3);
        assert.equal(P._mean([NaN, null]), null);
        assert.equal(P._mean(undefined), null);
    });

    it('_max returns the peak finite value', () => {
        assert.equal(P._max([0, 5, null, 3]), 5);
        assert.equal(P._max([null, NaN]), null);
    });

    it('_meanDirection averages compass angles circularly (350 and 10 -> 0)', () => {
        assert.equal(Math.round(P._meanDirection([350, 10]) ?? NaN), 0);
        assert.equal(P._meanDirection(undefined), null);
    });

    it('_at reads a finite value at idx or null', () => {
        assert.equal(P._at([1, 2, 3], 1), 2);
        assert.equal(P._at([1, null, 3], 1), null);
        assert.equal(P._at(undefined, 0), null);
    });

    it('_findHourIndex matches the hour-starting timestamp', () => {
        const times = ['2024-06-01T00:00', '2024-06-01T13:00', '2024-06-01T14:00'];
        assert.equal(P._findHourIndex(times, 13), 1);
        assert.equal(P._findHourIndex(times, 23), null);
        assert.equal(P._findHourIndex(times, undefined), null);
        assert.equal(P._findHourIndex(undefined, 13), null);
    });

});

describe('OpenMeteoProvider._applyDay', () => {

    it('maps the marine series: means rounded, direction as a circular int', () => {
        const marine = {
            time: ['2024-06-01T00:00', '2024-06-01T01:00'],
            sea_surface_temperature: [20, 22],
            wave_height: [1.0, 2.0],
            wave_period: [8, 8],
            wave_direction: [350, 10]
        };
        const day: WeatherSample = {};
        P._applyDay(day, marine, P._MARINE_METRICS);

        assert.equal(day.sst_c, 21);
        assert.equal(day.wave_height_m, 1.5);
        assert.equal(day.wave_period_s, 8);
        assert.equal(day.wave_direction_deg, 0);
    });

    it('uses the MAX for uv and gusts, the mean for the rest', () => {
        const air = {
            time: ['t0', 't1', 't2'],
            temperature_2m: [18, 20, 22],
            uv_index: [0, 8, 3],
            wind_speed_10m: [4, 6, 5],
            wind_direction_10m: [90, 90, 90],
            wind_gusts_10m: [10, 15, 12]
        };
        const day: WeatherSample = {};
        P._applyDay(day, air, P._AIR_METRICS);

        assert.equal(day.air_temperature_c, 20);
        // uv and gusts take the day MAX, not the mean (mean uv would be 3.67)
        assert.equal(day.uv_index, 8);
        assert.equal(day.wind_gusts_m_s, 15);
        assert.equal(day.wind_speed_m_s, 5);
        assert.equal(day.wind_direction_deg, 90);
    });

    it('skips fields whose series is missing or all-null', () => {
        const marine = {time: ['t0'], sea_surface_temperature: [19], wave_height: [null]};
        const day: WeatherSample = {};
        P._applyDay(day, marine, P._MARINE_METRICS);

        assert.equal(day.sst_c, 19);
        assert.equal(day.wave_height_m, undefined);
        assert.equal(day.wave_period_s, undefined);
        assert.ok(!P._isEmpty(day));
    });

});

describe('OpenMeteoProvider._applyHour', () => {

    it('picks the exact value at idx, rounded, with direction as an int', () => {
        const marine = {
            time: ['t0', 't1'],
            sea_surface_temperature: [20, 22.44],
            wave_height: [1.0, 2.345],
            wave_direction: [350, 10]
        };
        const hour: WeatherSample = {};
        P._applyHour(hour, marine, 1, P._MARINE_METRICS);

        assert.equal(hour.sst_c, 22.4);
        assert.equal(hour.wave_height_m, 2.35);
        assert.equal(hour.wave_direction_deg, 10);
    });

});

describe('OpenMeteoProvider._isEmpty', () => {

    it('is true only when no metric is set', () => {
        assert.equal(P._isEmpty({}), true);
        assert.equal(P._isEmpty({sst_c: 18}), false);
    });

});