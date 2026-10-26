import assert from 'node:assert/strict';
import {describe, it} from 'node:test';
import {Profile, SightingProfileRow} from '../src/Routes/Main/Species/Profile.js';

/*
 * Characterisation test for the big Profile._aggregate reducer (private static,
 * reached via a typed cast). It pins the observable output for a fixed input so
 * the method can be safely decomposed — any behavioural drift during the
 * refactor fails here. Pure: no DB, no HTTP.
 */
const row = (o: Partial<SightingProfileRow>): SightingProfileRow => ({
    id: 0,
    date: '2024-06-15',
    tour_start: '09:30',
    tour_fid: '',
    species_count: 0,
    juveniles: 0,
    calves: 0,
    newborns: 0,
    distance_coast: '',
    behaviours: '',
    reaction_id: 0,
    location_begin: '',
    beaufort_wind: 0,
    other_vehicle: '',
    depth_m: null,
    sst_c_day: null,
    chl_a_mg_m3_day: null,
    salinity_psu_day: null,
    sla_cm_day: null,
    current_speed_m_s_day: null,
    current_region_mean_speed_m_s_day: null,
    current_coastal_component_m_s_day: null,
    wave_height_m_day: null,
    uv_index_day: null,
    wind_speed_m_s_day: null,
    avg_speed_mps: null,
    max_speed_mps: null,
    total_distance_m: null,
    dominant_heading_deg: null,
    fishing_hours_day_25km: null,
    ...o
});

const rows: SightingProfileRow[] = [
    row({
        id: 1, date: '2024-06-15', tour_start: '09:30', tour_fid: 'T1', species_count: 3,
        juveniles: 1, distance_coast: '1000', behaviours: '{"0":"10","1":"11"}', reaction_id: 5,
        location_begin: '{"latitude":28.1,"longitude":-16.5}', beaufort_wind: 2, other_vehicle: '2 boats',
        depth_m: -50, sst_c_day: 20, chl_a_mg_m3_day: 0.5, salinity_psu_day: 36, sla_cm_day: 5,
        current_speed_m_s_day: 0.3, current_region_mean_speed_m_s_day: 0.2, current_coastal_component_m_s_day: 0.1,
        wave_height_m_day: 1.2, uv_index_day: 7, wind_speed_m_s_day: 4,
        avg_speed_mps: 1, max_speed_mps: 2, total_distance_m: 500, dominant_heading_deg: 90, fishing_hours_day_25km: 1
    }),
    row({
        id: 2, date: '2024-07-20', tour_start: '14:00', tour_fid: 'T2', species_count: 5,
        calves: 1, distance_coast: '2000', behaviours: '{"0":"10"}', reaction_id: 5,
        location_begin: '{"latitude":28.2,"longitude":-16.6}', beaufort_wind: 3,
        depth_m: -100, sst_c_day: 22, chl_a_mg_m3_day: 0.8, salinity_psu_day: 37, sla_cm_day: 6,
        current_speed_m_s_day: 0.4, current_region_mean_speed_m_s_day: 0.3, current_coastal_component_m_s_day: 0.2,
        wave_height_m_day: 1.5, uv_index_day: 8, wind_speed_m_s_day: 5,
        avg_speed_mps: 2, max_speed_mps: 3, total_distance_m: 800, dominant_heading_deg: 180, fishing_hours_day_25km: 2
    })
];

const behById = new Map<number, string>([[10, 'Feeding'], [11, 'Travelling']]);
const reactionById = new Map<number, string>([[5, 'Approach']]);
const tourHours = new Map<string, number>([['2024-06', 2.5], ['2024-07', 3.0]]);
const cooccurring = [{species_id: 9, species_name: 'Common Dolphin', tour_count: 4}];
const seismicRows = [{sighting_id: 1, distance_km: 50, hours_offset: 10, magnitude: 4.5}];
const background = [
    {sst_c_day: 19, chl_a_mg_m3_day: 0.4, depth_m: -40, distance_coast: '900'},
    {sst_c_day: 23, chl_a_mg_m3_day: 0.9, depth_m: -120, distance_coast: '2500'}
];

const aggregate = (
    Profile as unknown as {
        _aggregate: (...a: unknown[]) => Record<string, unknown>;
    }
)._aggregate;

const run = (): Record<string, unknown> => aggregate(
    5, 'Test Species', rows, {}, behById, reactionById, tourHours, cooccurring, seismicRows, background, []
);

describe('Profile._aggregate (characterisation)', () => {

    it('pins the sighting/tour/group counts', () => {
        const r = run();
        assert.equal(r.species_id, 5);
        assert.equal(r.species_name, 'Test Species');
        assert.equal(r.n_sightings, 2);
        assert.equal(r.n_unique_tours, 2);
        assert.equal(r.group_size_total, 8);
        assert.equal(r.group_size_p50, 4);
        assert.equal(r.period_from, '2024-06-15');
        assert.equal(r.period_to, '2024-07-20');
    });

    it('pins group ratios and temporal buckets', () => {
        const r = run();
        assert.deepEqual(r.group_ratios, {with_juveniles: 1, with_calves: 1, with_newborns: 0, total: 2});
        assert.deepEqual(r.monthly, [{ym: '2024-06', count: 1}, {ym: '2024-07', count: 1}]);
        const hourly = r.hourly as {hour: number; count: number;}[];
        assert.equal(hourly.find((h) => h.hour === 9)?.count, 1);
        assert.equal(hourly.find((h) => h.hour === 14)?.count, 1);
        assert.equal(hourly.reduce((s, h) => s + h.count, 0), 2);
    });

    it('pins behaviour, reaction and movement summaries', () => {
        const r = run();
        const beh = r.behaviour_mix as {label: string; count: number;}[];
        assert.equal(beh[0].label, 'Feeding');
        assert.equal(beh.find((b) => b.label === 'Feeding')?.count, 2);
        assert.equal(beh.find((b) => b.label === 'Travelling')?.count, 1);
        const react = r.reaction_mix as {label: string; count: number;}[];
        assert.equal(react[0].label, 'Approach');
        assert.equal(react[0].count, 2);
        const mv = r.movement as {n_with_movement: number; median_total_distance_m: number;};
        assert.equal(mv.n_with_movement, 2);
        assert.equal(mv.median_total_distance_m, 650);
    });

    it('pins the seismic and co-occurrence summaries', () => {
        const r = run();
        assert.deepEqual(r.cooccurrence, [{label: 'Common Dolphin', count: 4}]);
        const seis = r.seismic as {n_sightings_with_event: number; n_correlations: number; max_magnitude: number; median_distance_km: number;};
        assert.equal(seis.n_sightings_with_event, 1);
        assert.equal(seis.n_correlations, 1);
        assert.equal(seis.max_magnitude, 4.5);
        assert.equal(seis.median_distance_km, 50);
    });

    it('produces the full structured payload (bucketised env, heatmap, response)', () => {
        const r = run();
        assert.ok(Array.isArray((r.env as {sst_c: unknown[];}).sst_c));
        assert.ok(Array.isArray((r.env_extra as {salinity_psu: unknown[];}).salinity_psu));
        assert.ok(Array.isArray((r.pressure as {beaufort: unknown[];}).beaufort));
        assert.equal((r.heatmap as unknown[]).length, 2);
        assert.ok(r.response !== undefined);
        assert.ok(r.phenology !== undefined);
    });

});