import {describe, expect, it} from 'vitest';
import {SightingTableFilter} from '../src/inc/Pages/Sighting/SightingTableFilter';

// 2026-11-05 (local)
const NOW = new Date(2026, 10, 5);

describe('SightingTableFilter.parse', () => {

    it('returns null for invalid JSON and non-objects', () => {
        expect(SightingTableFilter.parse('{nope')).toBeNull();
        expect(SightingTableFilter.parse('[1,2]')).toBeNull();
        expect(SightingTableFilter.parse('null')).toBeNull();
    });

    it('keeps valid fields and drops unknown / mistyped ones', () => {
        const s = SightingTableFilter.parse(JSON.stringify({
            sort_key: 'date',
            sort_dir: 'asc',
            period_mode: 'current_year',
            species_id: 7,
            vehicle_id: '3',
            search: 'mother',
            include_old: true,
            foo: 'bar'
        }));

        expect(s).toEqual({
            sort_key: 'date',
            sort_dir: 'asc',
            period_mode: 'current_year',
            species_id: 7,
            search: 'mother',
            include_old: true
        });
    });

    it('rejects unknown sort keys, directions and period modes', () => {
        expect(SightingTableFilter.parse(JSON.stringify({
            sort_key: 'drop table',
            sort_dir: 'sideways',
            period_mode: 'forever'
        }))).toEqual({});
    });

});

describe('SightingTableFilter.resolvePeriod', () => {

    it('passes fixed dates through', () => {
        expect(SightingTableFilter.resolvePeriod('absolute', '2025-03-01', '2025-10-31', NOW))
        .toEqual({from: '2025-03-01', to: '2025-10-31'});
    });

    it('resolves the calendar years relative to now', () => {
        expect(SightingTableFilter.resolvePeriod('current_year', '', '', NOW)).toEqual({from: '2026-01-01', to: '2026-12-31'});
        expect(SightingTableFilter.resolvePeriod('last_year', '', '', NOW)).toEqual({from: '2025-01-01', to: '2025-12-31'});
    });

    it('resolves rolling windows (across month and year borders)', () => {
        expect(SightingTableFilter.resolvePeriod('last_30_days', '', '', NOW)).toEqual({from: '2026-10-06', to: '2026-11-05'});
        expect(SightingTableFilter.resolvePeriod('last_365_days', '', '', NOW)).toEqual({from: '2025-11-05', to: '2026-11-05'});
    });

    it('ignores stored dates when no / unknown mode is set', () => {
        expect(SightingTableFilter.resolvePeriod('', '2025-01-01', '2025-02-01', NOW)).toEqual({from: '', to: ''});
    });

});

describe('SightingTableFilter.toFilterValues / isActive', () => {

    it('maps settings onto list filter values', () => {
        const v = SightingTableFilter.toFilterValues({period_mode: 'last_year', species_id: 4, include_old: true}, NOW);

        expect(v).toEqual({
            period_from: '2025-01-01',
            period_to: '2025-12-31',
            species_id: 4,
            organization_id: 0,
            vehicle_id: 0,
            vehicle_driver_id: 0,
            search: '',
            include_old: true
        });
        expect(SightingTableFilter.isActive(v)).toBe(true);
    });

    it('treats the empty filter as inactive', () => {
        expect(SightingTableFilter.isActive(SightingTableFilter.emptyValues())).toBe(false);
    });

});