import assert from 'node:assert/strict';
import {describe, it} from 'node:test';
import {SightingSaveRequest} from 'mwpa_schemas';
import {CoastDistance} from '../src/Application/CoastDistance.js';
import {SightingSaveFields} from '../src/Application/SightingSaveFields.js';

/**
 * Guards the checks of /json/sightings/save (web dialog): required fields,
 * yes/no/unknown values, JSON columns in the app's shape, and the coast
 * distance computed from the cached coast lines.
 */
describe('SightingSaveFields', () => {

    const base = (): SightingSaveRequest => ({
        id: 0,
        date: '2026-11-09',
        vehicle_id: 1,
        vehicle_driver_id: 2,
        beaufort_wind: '2',
        location_begin: '{"latitude":28.1,"longitude":-17.3}',
        species_id: 3,
        species_count: 4,
        reaction_id: 0
    });

    it('accepts a complete request', () => {
        assert.equal(SightingSaveFields.check(base()), null);
    });

    it('rejects missing required fields', () => {
        assert.notEqual(SightingSaveFields.check({...base(), vehicle_id: 0}), null);
        assert.notEqual(SightingSaveFields.check({...base(), vehicle_driver_id: 0}), null);
        assert.notEqual(SightingSaveFields.check({...base(), species_id: 0}), null);
        assert.notEqual(SightingSaveFields.check({...base(), date: '2026.11.09'}), null);
        assert.notEqual(SightingSaveFields.check({...base(), location_begin: 'null'}), null);
        assert.notEqual(SightingSaveFields.check({...base(), species_count: -1}), null);
    });

    it('checks yes/no/unknown and group structure', () => {
        assert.equal(SightingSaveFields.check({...base(), juveniles: -1, calves: 1, photo_taken: 0}), null);
        assert.notEqual(SightingSaveFields.check({...base(), calves: 2}), null);
        assert.notEqual(SightingSaveFields.check({...base(), group_structure_id: 5}), null);
        assert.equal(SightingSaveFields.check({...base(), group_structure_id: 4}), null);
    });

    it('normalises id maps like the app writes them', () => {
        assert.equal(SightingSaveFields.idMap(''), '');
        assert.equal(SightingSaveFields.idMap('[5, "7", 5, 0]'), '{"0":"5","1":"7"}');
        assert.equal(SightingSaveFields.idMap('{"3":"9"}'), '{"0":"9"}');
        assert.equal(SightingSaveFields.idMap('{}'), '');
        assert.equal(SightingSaveFields.idMap('nope'), null);
        assert.equal(SightingSaveFields.idMap('5'), null);
    });

    it('normalises tag lists', () => {
        assert.equal(SightingSaveFields.tagList(' '), '');
        assert.equal(SightingSaveFields.tagList('[" SLP ","SPY","SLP",""]'), '["SLP","SPY"]');
        assert.equal(SightingSaveFields.tagList('[1]'), null);
        assert.equal(SightingSaveFields.tagList('{"a":"b"}'), null);
    });

    it('details contain only the sent fields', () => {
        const details = SightingSaveFields.details({...base(), calves: 1, behaviours: '[4]', recognizable_animals: ' Fin A '});

        assert.deepEqual(details, {calves: 1, behaviours: '{"0":"4"}', recognizable_animals: 'Fin A'});
    });

});

describe('CoastDistance', () => {

    it('is null without lines', () => {
        assert.equal(CoastDistance.distanceM(28, -17, []), null);
        assert.equal(CoastDistance.distanceM(28, -17, [[28, -17]]), null);
    });

    it('measures to the nearest segment', () => {
        // north-south coast line 0.01° east of the point (~982 m at 28°)
        const lines = [[27.9, -16.99, 28.1, -16.99], [29, -16, 29.1, -16]];
        const d = CoastDistance.distanceM(28, -17, lines)!;

        assert.ok(Math.abs(d - 982) < 5, `got ${d}`);
    });

    it('measures to a segment end point', () => {
        // segment ends 0.01° north of the point
        const d = CoastDistance.distanceM(28, -17, [[28.01, -17, 28.2, -17]])!;

        assert.ok(Math.abs(d - 1112) < 5, `got ${d}`);
    });

});