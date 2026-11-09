import {describe, expect, it} from 'vitest';
import {UtilSpeciesName} from '../src/inc/Utils/UtilSpeciesName';

describe('UtilSpeciesName.parse', () => {
    it('splits "English, German (Latin)"', () => {
        expect(UtilSpeciesName.parse('Bottlenose Dolphin, Grosser Tümmler (Tursiops truncatus) ')).toEqual({
            common: 'Bottlenose Dolphin',
            local: 'Grosser Tümmler',
            scientific: 'Tursiops truncatus'
        });
    });

    it('keeps names without the convention as common name', () => {
        expect(UtilSpeciesName.parse('Beaked Whale')).toEqual({common: 'Beaked Whale', local: '', scientific: ''});
    });

    it('keeps slashes in the local name and normalises the epithet case', () => {
        expect(UtilSpeciesName.parse('North Atlantic right whale, Atl. Nordkaper/Nördl. Glattwal (Eubalaena glacialis)').local)
        .toBe('Atl. Nordkaper/Nördl. Glattwal');
        expect(UtilSpeciesName.parse('Northern Bottlenose Whale, Nördl. Entenwal (Hyperoodon Ampullatus)').scientific)
        .toBe('Hyperoodon ampullatus');
    });

    it('handles a scientific name without local name', () => {
        expect(UtilSpeciesName.parse('Orca (Orcinus orca)')).toEqual({common: 'Orca', local: '', scientific: 'Orcinus orca'});
    });
});