import assert from 'node:assert/strict';
import {describe, it} from 'node:test';
import {CoastlineGeometry, LatLon} from '../src/Application/CoastlineGeometry.js';
import {OverpassCoastline} from '../src/Service/Coastline/OverpassCoastline.js';

/**
 * Guards the coast lines of /mobile/coastline: the box around the home area
 * (with margin), the cell for devices without home area, clipping to the box
 * and the Douglas-Peucker simplification.
 */
describe('CoastlineGeometry', () => {

    // home area off Valle Gran Rey, La Gomera ([lon, lat] like GeoJSON)
    const ring = [[-17.40, 28.05], [-17.30, 28.05], [-17.30, 28.15], [-17.40, 28.15], [-17.40, 28.05]];

    it('box of the home area grows by the margin', () => {
        const bbox = CoastlineGeometry.bboxOfRing(ring, 60000)!;

        // 60 km = 0.539° latitude, ~0.61° longitude at 28°
        assert.ok(Math.abs(bbox.south - (28.05 - 0.539)) < 0.001);
        assert.ok(Math.abs(bbox.north - (28.15 + 0.539)) < 0.001);
        assert.ok(Math.abs(bbox.west - (-17.40 - 0.611)) < 0.002);
        assert.ok(Math.abs(bbox.east - (-17.30 + 0.611)) < 0.002);
        assert.ok(CoastlineGeometry.isLoadable(bbox));
        assert.equal(CoastlineGeometry.bboxOfRing([], 60000), null);
    });

    it('too large areas are not loaded', () => {
        assert.equal(CoastlineGeometry.isLoadable({south: 20, west: -20, north: 30, east: -10}), false);
    });

    it('nearby positions share one cell', () => {
        const a = CoastlineGeometry.cellOf(28.07, -17.33, 60000)!;
        const b = CoastlineGeometry.cellOf(28.41, -17.02, 60000)!;

        assert.equal(a.key, 'cell:28.0:-17.5');
        assert.equal(a.key, b.key);
        assert.ok(a.bbox.south < 28.0 && a.bbox.north > 28.5);
        assert.equal(CoastlineGeometry.cellOf(Number.NaN, 1, 60000), null);
    });

    it('clip keeps the parts inside the box plus the neighbour outside', () => {
        const bbox = {south: 0, west: 0, north: 1, east: 1};
        const way: LatLon[] = [[-1, 0.5], [-0.5, 0.5], [0.5, 0.5], [1.5, 0.5], [2, 0.5], [2.5, 0.5], [0.6, 0.6], [0.7, 0.7]];
        const parts = CoastlineGeometry.clip(way, bbox);

        assert.deepEqual(parts, [
            [[-0.5, 0.5], [0.5, 0.5], [1.5, 0.5]],
            [[2.5, 0.5], [0.6, 0.6], [0.7, 0.7]]
        ]);
    });

    it('simplify drops points within the tolerance, keeps corners', () => {
        // straight line north with a 1 m wiggle, then a corner
        const way: LatLon[] = [[28, -17], [28.001, -17.00001], [28.002, -17], [28.002, -16.99]];
        const simple = CoastlineGeometry.simplify(way, 25);

        assert.deepEqual(simple, [[28, -17], [28.002, -17], [28.002, -16.99]]);
    });

    it('toLines gives flat [lat, lon, ...] lists rounded to 5 decimals', () => {
        const lines = CoastlineGeometry.toLines([[[0.123456789, 0.5], [0.5, 0.987654321]]], {south: 0, west: 0, north: 1, east: 1}, 25);

        assert.deepEqual(lines, [[0.12346, 0.5, 0.5, 0.98765]]);
    });

    it('Overpass answer: ways with geometry only', () => {
        const ways = OverpassCoastline.parse({
            elements: [
                {type: 'way', geometry: [{lat: 28, lon: -17}, {lat: 28.1, lon: -17.1}]},
                {type: 'way', geometry: [{lat: 28, lon: -17}]},
                {type: 'node'}
            ]
        });

        assert.deepEqual(ways, [[[28, -17], [28.1, -17.1]]]);
        assert.throws(() => OverpassCoastline.parse({}));
    });

});
