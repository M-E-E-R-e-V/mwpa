import assert from 'node:assert/strict';
import {describe, it} from 'node:test';
import {Excel} from '../src/Routes/Main/Sightings/Excel.js';

/*
 * The row/column builders are private static pure helpers, reached via a typed
 * cast. They derive the export cell values + header from a sighting; no DB.
 */
type Ctx = {
    vehiclesById: Map<number, string>;
    driversById: Map<number, string>;
    usersById: Map<number, string>;
    behStatesById: Map<number, string>;
    enCatsById: Map<number, string>;
    speciesNamesById: Map<number, string>;
    speciesName: string;
    beaufortWind: string;
    distance: string;
    date: {format: (f: string) => string;};
};

type Plan = {standard: string[]; optional: string[]; position: {headers: string[]; emit: () => string[];};};

const E = Excel as unknown as {
    _indexBy<T extends {id: number;}>(items: T[], val: (item: T) => string): Map<number, string>;
    _buildHeader(plan: Plan): string[];
    _emitStandard(key: string, entry: unknown, ctx: Ctx): string | number;
    _emitOptional(key: string, entry: unknown, ext: unknown, orgDescriptionById: Map<number, string>): string | number;
    _filterInfoRows(filter: unknown): (string | number)[][];
};

const ctx = (): Ctx => ({
    vehiclesById: new Map([[7, 'Boat1']]),
    driversById: new Map([[3, 'Skipper1']]),
    usersById: new Map([[2, 'Observer1']]),
    behStatesById: new Map(),
    enCatsById: new Map([[8, 'Approach']]),
    speciesNamesById: new Map(),
    speciesName: 'Common Dolphin',
    beaufortWind: '3',
    distance: '1.23',
    date: {format: (): string => '2024/06/15'}
});

describe('Excel._indexBy', () => {

    it('indexes id-bearing rows by id', () => {
        const m = E._indexBy([{id: 1, name: 'a'}, {id: 2, name: 'b'}], (x) => x.name);
        assert.equal(m.get(1), 'a');
        assert.equal(m.get(2), 'b');
        assert.equal(m.size, 2);
    });

});

describe('Excel._buildHeader', () => {

    const plan = (standard: string[], optional: string[]): Plan => ({
        standard: standard,
        optional: optional,
        position: {headers: ['PosA', 'PosB'], emit: (): string[] => []}
    });

    it('injects the position block right after duration_until', () => {
        const h = E._buildHeader(plan(['id', 'duration_until', 'distance_estimation'], ['unid']));
        const posAt = h.indexOf('PosA');
        assert.ok(posAt > 0);
        assert.equal(h[posAt + 1], 'PosB');
        // id label, duration_until label, 2 position cols, distance_estimation label, 1 optional
        assert.equal(h.length, 6);
    });

    it('appends the position block when duration_until is deselected', () => {
        const h = E._buildHeader(plan(['id', 'date'], []));
        assert.deepEqual(h.slice(-2), ['PosA', 'PosB']);
    });

});

describe('Excel._emitStandard', () => {

    it('maps columns to their formatted values', () => {
        const entry = {
            id: 42, tour_start: '09:30', tour_end: '13:00', vehicle_id: 7,
            vehicle_driver_id: 3, creater_id: 2, reaction_id: 8, species_count: 5
        };
        const c = ctx();
        assert.equal(E._emitStandard('id', entry, c), '42');
        assert.equal(E._emitStandard('date', entry, c), '2024/06/15');
        assert.equal(E._emitStandard('boat', entry, c), 'Boat1');
        assert.equal(E._emitStandard('skipper', entry, c), 'Skipper1');
        assert.equal(E._emitStandard('observer', entry, c), 'Observer1');
        assert.equal(E._emitStandard('species', entry, c), 'Common Dolphin');
        assert.equal(E._emitStandard('beaufort', entry, c), '3');
        assert.equal(E._emitStandard('reaction', entry, c), 'Approach');
        assert.equal(E._emitStandard('animal_count', entry, c), '5');
        assert.equal(E._emitStandard('nope', entry, c), '');
    });

    it('blanks unknown foreign keys', () => {
        const entry = {vehicle_id: 999, vehicle_driver_id: 0, creater_id: 0, reaction_id: 0};
        const c = ctx();
        assert.equal(E._emitStandard('boat', entry, c), '');
        assert.equal(E._emitStandard('reaction', entry, c), '');
    });

});

describe('Excel._emitOptional', () => {

    it('maps optional columns and ext env fields (undefined ext == blank)', () => {
        const entry = {unid: 'u-1', organization_id: 4, tour_fid: 'T9'};
        const org = new Map([[4, 'Org1']]);
        assert.equal(E._emitOptional('unid', entry, null, org), 'u-1');
        assert.equal(E._emitOptional('tour_fid', entry, null, org), 'T9');
        assert.equal(E._emitOptional('organization', entry, null, org), 'Org1');
        assert.equal(E._emitOptional('depth_m', entry, {depth_m: 123.4}, org), '123.4');
        // no ext row → the env column is blank (formatNumeric(undefined) === '')
        assert.equal(E._emitOptional('depth_m', entry, null, org), '');
        assert.equal(E._emitOptional('sst_c_day', entry, {sst_c_day: null}, org), '');
        assert.equal(E._emitOptional('nope', entry, null, org), '');
    });

});
describe('Excel._filterInfoRows', () => {

    it('lists only the set filter fields, in order', () => {
        const rows = E._filterInfoRows({period_from: '2024-01-01', species_id: 7, search: 'orca'});
        assert.deepEqual(rows, [['period_from', '2024-01-01'], ['species_id', 7], ['search', 'orca']]);
    });

    it('is empty for no filter', () => {
        assert.deepEqual(E._filterInfoRows(undefined), []);
        assert.deepEqual(E._filterInfoRows({}), []);
    });

});