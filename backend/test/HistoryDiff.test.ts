import assert from 'node:assert/strict';
import {describe, it} from 'node:test';
import {HistoryDiff} from '../src/Application/History/HistoryDiff.js';
import {SightingHistory} from '../src/Application/History/SightingHistory.js';

describe('HistoryDiff', () => {

    it('compares as text: number vs string, null vs empty and booleans', () => {
        assert.equal(HistoryDiff.text(5), '5');
        assert.equal(HistoryDiff.text(null), '');
        assert.equal(HistoryDiff.text(undefined), '');
        assert.equal(HistoryDiff.text(true), '1');
        assert.equal(HistoryDiff.text(false), '0');

        const fields = ['a', 'b', 'c'];
        const before = HistoryDiff.snapshot({a: 1, b: null, c: false}, fields);
        const after = HistoryDiff.snapshot({a: '1', b: '', c: 0}, fields);

        assert.deepEqual(HistoryDiff.diff(before, after, fields), []);
    });

    it('lists only changed fields, in field order', () => {
        const fields = ['species_id', 'note', 'deleted'];
        const before = HistoryDiff.snapshot({species_id: 3, note: 'x', deleted: false}, fields);
        const after = HistoryDiff.snapshot({species_id: 7, note: 'x', deleted: true}, fields);

        assert.deepEqual(HistoryDiff.diff(before, after, fields), [
            {field: 'species_id', old_value: '3', new_value: '7'},
            {field: 'deleted', old_value: '0', new_value: '1'}
        ]);
    });

    it('treats re-serialised JSON and empty JSON structures as unchanged', () => {
        const fields = ['location_begin', 'behaviours', 'other_species', 'freq_behaviour'];
        const before = {
            location_begin: '{"longitude":-122.0799983,"latitude":37.4279,"accuracy":5.0,"floor":null}',
            behaviours: '{"0":""}',
            other_species: '{}',
            freq_behaviour: 'null'
        };
        const after = {
            location_begin: '{"longitude":-122.0799983,"latitude":37.4279,"accuracy":5,"floor":null}',
            behaviours: '',
            other_species: '',
            freq_behaviour: ''
        };

        assert.deepEqual(HistoryDiff.diff(before, after, fields), []);
    });

    it('keeps real JSON changes with the raw values', () => {
        const fields = ['location_begin', 'behaviours'];
        const before = {location_begin: '{"latitude":37.4279,"longitude":-122.08}', behaviours: '{"0":"3"}'};
        const after = {location_begin: '{"latitude":37.5,"longitude":-122.08}', behaviours: '{"0":""}'};

        assert.deepEqual(HistoryDiff.diff(before, after, fields), [
            {field: 'location_begin', old_value: before.location_begin, new_value: after.location_begin},
            {field: 'behaviours', old_value: '{"0":"3"}', new_value: '{"0":""}'}
        ]);
    });

    it('ignores fields that are not tracked', () => {
        const before = HistoryDiff.snapshot({species_id: 1, update_datetime: 100}, SightingHistory.FIELDS);
        const after = HistoryDiff.snapshot({species_id: 1, update_datetime: 200}, SightingHistory.FIELDS);

        assert.deepEqual(HistoryDiff.diff(before, after, SightingHistory.FIELDS), []);
        assert.ok(!(SightingHistory.FIELDS as readonly string[]).includes('update_datetime'));
    });

});