import assert from 'node:assert/strict';
import {describe, it} from 'node:test';
import {CreateExport} from '../src/Routes/Export/OfficeReport/CreateExport.js';

/*
 * The AROC row-cell mapping is a private static pure helper (apart from a couple
 * of diagnostic logs). Reached via a typed cast — it maps a sighting to the
 * data-sheet cell record; no DB, no XLSX. This pins the column wiring of the
 * government-report export.
 */
type Link = {externid: string; externname: string;} | null;

const E = CreateExport as unknown as {
    _buildArocRowCells(entry: unknown, link: Link, ctx: unknown): Record<string, string | number>;
    _resolveNombreComun(link: Link, speciesId: number, ctx: unknown): string;
};

const ctx = (): unknown => ({
    arocSpeciesIndex: {
        byExternId: new Map([['AROC20', 'Delfín mular']]),
        byNombreLower: new Map([['bottlenose', 'Delfín mular (name)']])
    },
    userNames: new Map([[2, 'Observer1']]),
    behStates: new Map(),
    enCats: new Map([[8, {name: 'Interaction'}]]),
    externalReceiverId: 1
});

const entry = {
    date: '2024-06-15 10:00:00', tour_start: '09:30', tour_end: '13:00', duration_from: '0.5',
    species_id: 20, creater_id: 2, calves: 2, newborns: 0, behaviours: '', reaction_id: 8,
    location_begin: '{"latitude":28.1,"longitude":-16.5}', other_vehicle: '3 boats',
    species_count: 5, note: 'a note'
};

describe('CreateExport._buildArocRowCells', () => {

    it('maps a sighting to the AROC data-sheet cells', () => {
        const c = E._buildArocRowCells(entry, {externid: 'AROC20', externname: 'Bottlenose'}, ctx());
        assert.equal(c.J, '15/06/2024');
        assert.equal(c.K, '09:30');
        assert.equal(c.N, 'Delfín mular');
        assert.equal(c.Q, 'Observer1');
        assert.equal(c.R, 'WGS84');
        assert.equal(c.AF, 5);
        // AH = SI because calves are present
        assert.equal(c.AH, 'SI');
        assert.equal(c.AI, 2);
        // AJ = NO because there are no newborns
        assert.equal(c.AJ, 'NO');
        assert.equal(c.AK, undefined);
        // reaction Interaction maps to atraídos
        assert.equal(c.AL, 'atraídos');
        // no behaviours -> empty activity
        assert.equal(c.AM, '');
        // "3 boats" parses to 3
        assert.equal(c.AN, 3);
        assert.equal(c.AO, 'a note');
    });

    it('fills the position block (hemisphere, decimals, UTM) when a position is present', () => {
        const c = E._buildArocRowCells(entry, {externid: 'AROC20', externname: 'x'}, ctx());
        // western longitude -> O
        assert.equal(c.W, 'O');
        assert.equal(c.AA, -16.5);
        assert.equal(c.AE, 28.1);
        assert.equal(typeof c.U, 'number');
        assert.equal(typeof c.V, 'number');
    });

    it('omits the position block when there is no parseable position', () => {
        const c = E._buildArocRowCells({...entry, location_begin: ''}, {externid: 'AROC20', externname: 'x'}, ctx());
        assert.equal(c.W, undefined);
        assert.equal(c.U, undefined);
    });

});

describe('CreateExport._resolveNombreComun', () => {

    it('resolves by externid first, then by name, else blank', () => {
        assert.equal(E._resolveNombreComun({externid: 'AROC20', externname: 'x'}, 20, ctx()), 'Delfín mular');
        assert.equal(E._resolveNombreComun({externid: 'nope', externname: 'Bottlenose'}, 20, ctx()), 'Delfín mular (name)');
        assert.equal(E._resolveNombreComun({externid: 'nope', externname: 'unknown'}, 20, ctx()), '');
        assert.equal(E._resolveNombreComun(null, 20, ctx()), '');
    });

});