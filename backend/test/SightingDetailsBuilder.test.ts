import assert from 'node:assert/strict';
import {describe, it} from 'node:test';
import {SightingDetailsBuilder, SightingDetailsInput} from '../src/Application/SightingDetails/SightingDetailsBuilder.js';
import {Sighting} from '../src/Db/MariaDb/Entities/Sighting.js';
import {SightingExtended} from '../src/Db/MariaDb/Entities/SightingExtended.js';

const sighting = (): Sighting => Object.assign(new Sighting(), {
    id: 42,
    unid: 'u-42',
    creater_id: 1,
    create_datetime: 1700000000,
    update_datetime: 1700000100,
    device_id: 0,
    tour_id: 7,
    tour_fid: 'fid',
    sighting_type: 1,
    source_import_file: '',
    syncblock: false
});

const input = (patch: Partial<SightingDetailsInput> = {}): SightingDetailsInput => ({
    sighting: sighting(),
    creatorName: 'Guide1',
    deviceName: '',
    organizationName: 'Org',
    extended: null,
    enrichment: null,
    effort: null,
    vessels: [],
    movement: null,
    seismic: [],
    ...patch
});

describe('SightingDetailsBuilder', () => {

    it('formats numbers from numbers and decimal strings, empty for missing', () => {
        assert.equal(SightingDetailsBuilder.num(1.234, 1), '1.2');
        assert.equal(SightingDetailsBuilder.num('19.850', 2), '19.85');
        assert.equal(SightingDetailsBuilder.num(null), '');
        assert.equal(SightingDetailsBuilder.num(''), '');
        assert.equal(SightingDetailsBuilder.num('abc'), '');
        assert.equal(SightingDetailsBuilder.seconds(new Date(Date.UTC(2026, 0, 1))), 1767225600);
        assert.equal(SightingDetailsBuilder.seconds(null), 0);
    });

    it('builds all sections even without derived rows', () => {
        const sections = SightingDetailsBuilder.build(input());

        assert.deepEqual(sections.map((s) => s.key), ['meta', 'weather', 'sea', 'astro', 'human', 'movement', 'seismic']);

        const record = sections[0].groups[0];
        const value = (label: string): string => record.items.find((i) => i.label === label)?.values[0] ?? '?';

        assert.equal(value('ID'), '42');
        assert.equal(value('Source'), 'Web');
        assert.equal(value('Tour'), '#7');
        assert.equal(value('Sighting type'), 'Short entry');
        assert.equal(sections[5].groups[0].items.length, 0);
        assert.equal(sections[5].groups[0].status, '');
    });

    it('puts day and hour values side by side', () => {
        const extended = Object.assign(new SightingExtended(), {
            air_temperature_c_day: '21.44',
            air_temperature_c_hour: 23.1,
            weather_hour_used: 9,
            weather_status: 'ok',
            weather_last_update: new Date(Date.UTC(2026, 0, 1))
        });
        const weather = SightingDetailsBuilder.build(input({extended: extended}))[1].groups[0];

        assert.deepEqual(weather.columns, ['Day mean', 'At hour']);
        assert.equal(weather.status, 'ok');
        assert.equal(weather.updated, 1767225600);
        assert.deepEqual(weather.items[0].values, ['21.4', '23.1']);
        assert.deepEqual(weather.items.find((i) => i.label === 'Hour used')?.values, ['', '09:00']);
    });

});