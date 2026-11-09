import {describe, it} from 'node:test';
import assert from 'node:assert/strict';
import {Natura2000Sites} from '../src/Service/ProtectedArea/Natura2000Sites.js';

const square = {type: 'Polygon', coordinates: [[[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]]};

describe('Natura2000Sites.merge', () => {
    it('keeps one feature per site code across the habitats and birds layers', () => {
        const merged = Natura2000Sites.merge([
            {features: [
                {properties: {SITECODE: 'ES7020123', SITENAME: 'Franja marina Santiago-Valle Gran Rey', SITETYPE: 'B', Area_km2: 131.2958}, geometry: square},
                {properties: {SITECODE: 'ES0000044', SITENAME: 'Garajonay', SITETYPE: 'C', Area_km2: 38.3}, geometry: square}
            ]},
            {features: [
                {properties: {SITECODE: 'ES0000044', SITENAME: 'Garajonay', SITETYPE: 'C', Area_km2: 38.3}, geometry: square},
                {properties: {SITECODE: 'ES0000526', SITENAME: 'Espacio marino de La Gomera-Teno', SITETYPE: 'A', Area_km2: 2092.2}, geometry: square}
            ]}
        ]);

        assert.equal(merged.type, 'FeatureCollection');
        assert.deepEqual(merged.features.map((f) => f.properties.code), ['ES0000526', 'ES7020123', 'ES0000044']);

        const santiago = merged.features.find((f) => f.properties.code === 'ES7020123')!;
        assert.equal(santiago.properties.site_type, 'B');
        assert.equal(santiago.properties.area_km2, 131.3);
        assert.equal(santiago.properties.url, 'https://natura2000.eea.europa.eu/Natura2000/SDF.aspx?site=ES7020123');
    });

    it('skips features without code or polygon geometry', () => {
        const merged = Natura2000Sites.merge([{features: [
            {properties: {SITECODE: '', SITENAME: 'x'}, geometry: square},
            {properties: {SITECODE: 'ES1', SITENAME: 'point'}, geometry: {type: 'Point', coordinates: [0, 0]}},
            {properties: {SITECODE: 'ES2', SITENAME: 'none'}, geometry: null}
        ]}]);

        assert.equal(merged.features.length, 0);
    });

    it('throws on an answer without features (service error page)', () => {
        assert.throws(() => Natura2000Sites.merge([{}]));
    });
});