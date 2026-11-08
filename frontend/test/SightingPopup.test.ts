import {describe, expect, it} from 'vitest';
import {SightingPopup, SightingPopupLookups} from '../src/inc/Utils/SightingPopup';
import {SightingsEntry} from '../src/inc/Api/Sightings';

const lookups = {
    species: new Map([[20, {name: 'Common Dolphin, Delphinus delphis'}]]),
    vehicles: new Map([[7, {name: 'Boat1'}]]),
    drivers: new Map([[3, {user: {name: 'Skipper1'}}]]),
    organizations: new Map([[4, {description: 'Org1'}]]),
    behaviours: new Map([[10, {name: 'Feeding'}], [11, {name: 'Travelling'}]]),
    encounterCategories: new Map([[8, {name: 'Approach'}]])
} as unknown as SightingPopupLookups;

const entry = {
    id: 1, tour_id: 2, date: '2024-06-15 10:00:00',
    vehicle_id: 7, vehicle_driver_id: 3, organization_id: 4,
    species_count: 5, juveniles: 2, calves: 1, newborns: 0,
    tour_start: '09:30', tour_end: '13:00',
    distance_coast: '1234.5', other_species: '{"0":"20"}', behaviours: '{"0":"10","1":"11"}',
    reaction_id: 8, note: 'a note', beaufort_wind: '3'
} as unknown as SightingsEntry;

const P = SightingPopup as unknown as {
    parseIdMapNames(json: string, resolve: (id: number) => string | undefined): string[];
    _groupSizeStr(entry: SightingsEntry): string;
};

describe('SightingPopup.rows', () => {

    it('derives the popover field rows (labels are English keys)', () => {
        const map = new Map(SightingPopup.rows(entry, lookups));
        expect(map.get('Date')).toBe('2024.06.15');
        expect(map.get('Sighting')).toBe('#1 · Tour #2');
        expect(map.get('Time')).toBe('09:30 – 13:00');
        expect(map.get('Other species')).toBe('Common Dolphin');
        expect(map.get('Group-Size')).toBe('5 (2 juv, 1 calves)');
        expect(map.get('Behaviour')).toBe('Feeding, Travelling');
        expect(map.get('Reaction')).toBe('Approach');
        expect(map.get('Vehicle')).toBe('Boat1');
        expect(map.get('Driver')).toBe('Skipper1');
        expect(map.get('Organization')).toBe('Org1');
        expect(map.get('Distance')).toBe('1234.50 mi');
        expect(map.get('Note')).toBe('a note');
    });

    it('leaves unknown foreign keys and absent fields empty', () => {
        const bare = {id: 9, tour_id: 0} as unknown as SightingsEntry;
        const map = new Map(SightingPopup.rows(bare, lookups));
        expect(map.get('Vehicle')).toBe('');
        expect(map.get('Reaction')).toBe('');
        expect(map.get('Other species')).toBe('');
        expect(map.get('Group-Size')).toBe('');
    });

});

describe('SightingPopup._parseIdMapNames', () => {

    it('resolves a JSON id-map to names, skipping unknown ids', () => {
        const r = SightingPopup.parseIdMapNames('{"0":"10","1":"99","2":"11"}', (id) => lookups.behaviours.get(id)?.name);
        expect(r).toEqual(['Feeding', 'Travelling']);
    });

    it('returns [] for malformed or non-object JSON', () => {
        expect(SightingPopup.parseIdMapNames('not json', () => 'x')).toEqual([]);
        expect(SightingPopup.parseIdMapNames('', () => 'x')).toEqual([]);
        expect(SightingPopup.parseIdMapNames('42', () => 'x')).toEqual([]);
    });

});

describe('SightingPopup._groupSizeStr', () => {

    it('formats the group size with demographic extras', () => {
        expect(P._groupSizeStr({species_count: 5, juveniles: 2, calves: 0, newborns: 1} as unknown as SightingsEntry)).toBe('5 (2 juv, 1 newborn)');
        expect(P._groupSizeStr({species_count: 3} as unknown as SightingsEntry)).toBe('3');
        expect(P._groupSizeStr({} as unknown as SightingsEntry)).toBe('');
    });

});