import assert from 'node:assert/strict';
import {describe, it} from 'node:test';
import {SightingMovementService} from '../src/Service/Movement/SightingMovementService.js';

/*
 * The aggregate helpers are `private static` pure functions over the segment
 * list. Surface them via a typed cast (same approach as the other provider
 * tests) so we exercise the real reduction logic without a DB or HTTP.
 */
type Seg = {
    start_lat: number;
    start_lon: number;
    end_lat: number;
    end_lon: number;
    start_dt: number;
    end_dt: number;
    distance_m: number;
    duration_s: number;
    speed_mps: number | null;
    heading_deg: number | null;
    turning_angle_deg: number | null;
    quality: 'good' | 'bad';
};

const S = SightingMovementService as unknown as {
    _minMax(xs: number[]): {min: number | null; max: number | null;};
    _boundingBox(segs: Seg[]): {min_lat: number | null; min_lon: number | null; max_lat: number | null; max_lon: number | null;};
    _headingStats(segs: Seg[]): {dominant: number | null; variance: number | null;};
    _buildAggregates(segs: Seg[]): {
        total_distance_m: number;
        total_duration_s: number;
        avg_speed_mps: number | null;
        max_speed_mps: number | null;
        dominant_heading_deg: number | null;
        heading_variance_deg: number | null;
        bbox_min_lat: number | null;
        bbox_max_lat: number | null;
        bbox_min_lon: number | null;
        bbox_max_lon: number | null;
        first_dt: number;
        last_dt: number;
    };
};

const seg = (o: Partial<Seg>): Seg => ({
    start_lat: 0,
    start_lon: 0,
    end_lat: 0,
    end_lon: 0,
    start_dt: 0,
    end_dt: 0,
    distance_m: 0,
    duration_s: 0,
    speed_mps: null,
    heading_deg: null,
    turning_angle_deg: null,
    quality: 'good',
    ...o
});

describe('SightingMovementService._minMax', () => {

    it('returns the single-pass min and max', () => {
        assert.deepEqual(S._minMax([3, 1, 2]), {min: 1, max: 3});
    });

    it('returns nulls for an empty list', () => {
        assert.deepEqual(S._minMax([]), {min: null, max: null});
    });

});

describe('SightingMovementService._boundingBox', () => {

    it('spans every segment endpoint (start and end)', () => {
        const segs = [
            seg({start_lat: 10, start_lon: 0, end_lat: 11, end_lon: 1}),
            seg({start_lat: 11, start_lon: 1, end_lat: 13, end_lon: 3})
        ];
        assert.deepEqual(S._boundingBox(segs), {min_lat: 10, min_lon: 0, max_lat: 13, max_lon: 3});
    });

    it('is all-null for no segments', () => {
        assert.deepEqual(S._boundingBox([]), {min_lat: null, min_lon: null, max_lat: null, max_lon: null});
    });

});

describe('SightingMovementService._headingStats', () => {

    it('takes the circular mean of good headings (10 and 350 -> ~0)', () => {
        const stats = S._headingStats([seg({heading_deg: 10}), seg({heading_deg: 350})]);
        assert.equal(Math.round(stats.dominant ?? NaN), 0);
        assert.ok((stats.variance ?? 0) > 0);
    });

    it('excludes bad segments and needs >=2 headings for a variance', () => {
        const stats = S._headingStats([
            seg({heading_deg: 90}),
            seg({heading_deg: 270, quality: 'bad'})
        ]);
        assert.equal(stats.dominant, 90);
        assert.equal(stats.variance, null);
    });

    it('is null/null when no segment carries a heading', () => {
        assert.deepEqual(S._headingStats([seg({}), seg({})]), {dominant: null, variance: null});
    });

});

describe('SightingMovementService._buildAggregates', () => {

    it('totals all segments, but excludes bad ones from the max speed', () => {
        const segs = [
            seg({distance_m: 100, duration_s: 50, speed_mps: 2, heading_deg: 90, start_dt: 1000, end_dt: 1050, start_lat: 10, start_lon: 0, end_lat: 11, end_lon: 1}),
            seg({distance_m: 200, duration_s: 50, speed_mps: 4, heading_deg: 90, start_dt: 1050, end_dt: 1100, start_lat: 11, start_lon: 1, end_lat: 12, end_lon: 2}),
            seg({distance_m: 50, duration_s: 10, speed_mps: 99, heading_deg: 90, quality: 'bad', start_dt: 1100, end_dt: 1110, start_lat: 12, start_lon: 2, end_lat: 13, end_lon: 3})
        ];
        const agg = S._buildAggregates(segs);

        assert.equal(agg.total_distance_m, 350);
        assert.equal(agg.total_duration_s, 110);
        // the bad 99 m/s outlier is excluded from the max speed
        assert.equal(agg.max_speed_mps, 4);
        assert.ok(Math.abs((agg.avg_speed_mps ?? 0) - (350 / 110)) < 1e-9);
        assert.equal(agg.dominant_heading_deg, 90);
        assert.equal(agg.heading_variance_deg, 0);
        assert.deepEqual(
            [agg.bbox_min_lat, agg.bbox_max_lat, agg.bbox_min_lon, agg.bbox_max_lon],
            [10, 13, 0, 3]
        );
        assert.equal(agg.first_dt, 1000);
        assert.equal(agg.last_dt, 1110);
    });

    it('yields a null average speed when there is no duration', () => {
        const agg = S._buildAggregates([seg({distance_m: 0, duration_s: 0})]);
        assert.equal(agg.avg_speed_mps, null);
        assert.equal(agg.max_speed_mps, null);
    });

});