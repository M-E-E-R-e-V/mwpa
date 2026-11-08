import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {describe, it} from 'node:test';
import {CoordResolver} from '../src/Scripts/SightingOld/CoordResolver.js';
import {ImportValue} from '../src/Scripts/SightingOld/ImportValue.js';
import {SightingOldImporter} from '../src/Scripts/SightingOld/SightingOldImporter.js';
import {SpeciesResolver} from '../src/Scripts/SightingOld/SpeciesResolver.js';

/**
 * Guards the pure parts of the sighting_old importer (ported from the former
 * backend/scripts/import-sighting-old.cjs): cell-value coercion, species
 * name resolution and the coordinate recovery heuristics.
 */
describe('SightingOld import', () => {

    describe('ImportValue', () => {

        it('formats dates and times in UTC', () => {
            const d = new Date(Date.UTC(2003, 4, 7, 9, 5));
            assert.equal(ImportValue.toIsoDate(d), '2003-05-07');
            assert.equal(ImportValue.toHHmm(d), '09:05');
            assert.equal(ImportValue.toIsoDate('2003-05-07'), null);
            assert.equal(ImportValue.toHHmm(null), '');
        });

        it('parses minutes-of-day', () => {
            assert.equal(ImportValue.minutesOf('09:05'), 545);
            assert.equal(ImportValue.minutesOf('9:05:00'), 545);
            assert.equal(ImportValue.minutesOf(''), null);
            assert.equal(ImportValue.minutesOf(null), null);
        });

        it('coerces numbers with comma decimals', () => {
            assert.equal(ImportValue.numOrNull('12,5'), 12.5);
            assert.equal(ImportValue.numOrNull(' '), null);
            assert.equal(ImportValue.numOrNull('abc'), null);
            assert.equal(ImportValue.intOr('3,6', 0), 4);
            assert.equal(ImportValue.intOr(null, 7), 7);
        });

        it('maps yes-like flags to 1', () => {
            for (const v of ['yes', 'JA', '1', 'x', 'true']) {
                assert.equal(ImportValue.yesTo1(v), 1);
            }

            assert.equal(ImportValue.yesTo1('no'), 0);
            assert.equal(ImportValue.yesTo1(null), 0);
        });

    });

    describe('SpeciesResolver', () => {

        const resolver = (): SpeciesResolver => new SpeciesResolver([
            {id: 1, name: 'Pilot whale, Globicephala macrorhynchus'},
            {id: 2, name: 'Atlantic spotted dolphin, Stenella frontalis'},
            {id: 3, name: 'Cuvier\'s beaked whale, Ziphius cavirostris'},
            {id: 9, name: 'Unknown'}
        ]);

        it('resolves direct names and synonyms', () => {
            const r = resolver();
            assert.equal(r.resolve('Pilot Whale'), 1);
            assert.equal(r.resolve('Short-finned pilot whale'), 1);
            assert.equal(r.resolve('Spotted dolphin'), 2);
            assert.equal(r.resolve('Cuvier beaked whale'), 3);
            assert.equal(r.resolve('Unidentified dolphin'), 9);
            assert.equal(r.unresolved.size, 0);
        });

        it('returns 0 for empty, mixed and unknown names and counts the latter', () => {
            const r = resolver();
            assert.equal(r.resolve(''), 0);
            assert.equal(r.resolve('Pilot whale or dolphin'), 0);
            assert.equal(r.resolve('Orca'), 0);
            assert.equal(r.resolve('Orca'), 0);
            assert.equal(r.unresolved.get('Orca'), 2);
            assert.equal(r.unresolved.size, 2);
        });

    });

    describe('SightingOldImporter.parseArgs', () => {

        const withConfig = (cfg: unknown): string => {
            const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'so-cfg-'));
            fs.writeFileSync(path.join(dir, 'config.json'), JSON.stringify(cfg));
            return dir;
        };

        it('reads db.mysql from ./config.json when no DB args are given', () => {
            const dir = withConfig({db: {mysql: {host: 'mariadb', port: 3306, username: 'mwpa', password: 'pw', database: 'prod'}}});
            const o = SightingOldImporter.parseArgs(['--excel', 'x.xlsx'], {}, dir);
            assert.deepEqual(
                [o.host, o.port, o.user, o.password, o.database, o.excel, o.commit],
                ['mariadb', 3306, 'mwpa', 'pw', 'prod', 'x.xlsx', false]
            );
        });

        it('lets CLI args override config.json', () => {
            const dir = withConfig({db: {mysql: {host: 'mariadb', port: 3306}}});
            const o = SightingOldImporter.parseArgs(['--host', 'other', '--commit'], {}, dir);
            assert.equal(o.host, 'other');
            assert.equal(o.port, 3306);
            assert.equal(o.commit, true);
        });

        it('honours an explicit --config path', () => {
            const dir = withConfig({db: {mysql: {database: 'fromfile'}}});
            const o = SightingOldImporter.parseArgs(['--config', path.join(dir, 'config.json')], {}, os.tmpdir());
            assert.equal(o.database, 'fromfile');
        });

        it('falls back to DB_MYSQL_* env, then dev defaults', () => {
            const empty = fs.mkdtempSync(path.join(os.tmpdir(), 'so-none-'));
            const o = SightingOldImporter.parseArgs([], {DB_MYSQL_HOST: 'envhost', DB_MYSQL_PORT: '3310'}, empty);
            assert.deepEqual([o.host, o.port, o.user, o.database], ['envhost', 3310, 'root', 'mwpa']);
        });

        it('ignores a config.json that is not valid JSON', () => {
            const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'so-bad-'));
            fs.writeFileSync(path.join(dir, 'config.json'), '{nope');
            assert.deepEqual(SightingOldImporter.loadDbConfig(path.join(dir, 'config.json')), {});
        });

    });

    describe('CoordResolver', () => {

        it('parses DD.MM.mmm and dotless DDMMmm raw positions', () => {
            assert.ok(Math.abs((CoordResolver.dmToDD('17.08.52') ?? 0) - (17 + (8.52 / 60))) < 1e-9);
            assert.ok(Math.abs((CoordResolver.dmToDD(171493) ?? 0) - (17 + (14.93 / 60))) < 1e-9);
            assert.equal(CoordResolver.dmToDD(1714), null);
            assert.equal(CoordResolver.dmToDD('17.75'), null);
            assert.equal(CoordResolver.dmToDD(''), null);
        });

        it('keeps plausible DD values and recovers impossible ones from raw', () => {
            const c = new CoordResolver();
            assert.deepEqual(c.parseCoord(28.1, -17.2, '', '', 'r'), {lat: 28.1, lon: -17.2});

            const fixed = c.parseCoord(28.1, -1720.5, '', '17.12.00', 'r');
            assert.ok(fixed !== null);
            assert.ok(Math.abs(fixed.lon - -17.2) < 1e-9);
            assert.equal(c.notes.length, 1);

            assert.equal(c.parseCoord(28.1, -1720.5, '', 'garbage', 'r'), null);
            assert.match(c.notes[1], /DROPPED/u);
        });

        it('recovers an integer-degree typo via the other endpoint', () => {
            const c = new CoordResolver();
            const anchor = {lat: 28.1, lon: -17.3};
            const out = c.crossRecover({lat: 28.12, lon: -27.36}, anchor, 'end');
            assert.ok(out !== null);
            assert.ok(Math.abs(out.lon - -17.36) < 1e-9);
            assert.equal(out.lat, 28.12);
            assert.equal(c.notes.length, 1);
        });

        it('does not touch a lon==lat copy error', () => {
            const c = new CoordResolver();
            const bad = {lat: 28.1, lon: -28.1};
            assert.equal(c.crossRecover(bad, {lat: 28.1, lon: -17.3}, 'end'), bad);
            assert.equal(c.notes.length, 0);
        });

        it('flags but keeps out-of-region coordinates on finalize', () => {
            const c = new CoordResolver();
            assert.equal(c.finalizeCoord({lat: 40, lon: -17}, 'x'), JSON.stringify({latitude: 40, longitude: -17}));
            assert.match(c.notes[0], /SUSPECT/u);
            assert.equal(c.finalizeCoord(null, 'x'), null);
        });

    });

});