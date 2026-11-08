import assert from 'node:assert/strict';
import {describe, it} from 'node:test';
import {TableFilterEntry} from 'mwpa_schemas';
import {TableFilterValidator} from '../src/Routes/Main/TableFilter/TableFilterValidator.js';

const entry = (patch: Partial<TableFilterEntry>): TableFilterEntry => ({
    unid: '',
    table_name: 'sighting',
    name: 'My filter',
    settings: '{}',
    position: 0,
    ...patch
});

/**
 * Save-request checks of the private list filter presets.
 */
describe('TableFilterValidator.validate', () => {

    it('accepts a valid preset and trims the name', () => {
        const res = TableFilterValidator.validate(entry({name: '  Season 2025  ', settings: '{"species_id":3}'}));
        assert.equal(res.error, '');
        assert.equal(res.name, 'Season 2025');
    });

    it('requires a name', () => {
        assert.equal(TableFilterValidator.validate(entry({name: '   '})).error, 'Name is required');
    });

    it('cuts overlong names', () => {
        const res = TableFilterValidator.validate(entry({name: 'x'.repeat(300)}));
        assert.equal(res.error, '');
        assert.equal(res.name.length, TableFilterValidator.MAX_NAME_LENGTH);
    });

    it('rejects unknown tables', () => {
        assert.equal(TableFilterValidator.validate(entry({table_name: 'users'})).error, 'Unknown table');
    });

    it('rejects invalid or non-object JSON', () => {
        assert.equal(TableFilterValidator.validate(entry({settings: '{nope'})).error, 'Settings are no valid JSON');
        assert.equal(TableFilterValidator.validate(entry({settings: '[1]'})).error, 'Settings must be a JSON object');
        assert.equal(TableFilterValidator.validate(entry({settings: 'null'})).error, 'Settings must be a JSON object');
    });

    it('rejects oversized settings', () => {
        const big = JSON.stringify({search: 'x'.repeat(TableFilterValidator.MAX_SETTINGS_LENGTH)});
        assert.equal(TableFilterValidator.validate(entry({settings: big})).error, 'Settings too large');
    });

});
