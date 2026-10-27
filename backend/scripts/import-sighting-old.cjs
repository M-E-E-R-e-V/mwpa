#!/usr/bin/env node
/**
 * One-time import of the hand-maintained historical sightings from a legacy
 * spreadsheet export (the `data_fusion` sheet) into `sighting_old`.
 *
 * Standalone on purpose: mysql2 + exceljs only, NO figtree import — so it is
 * not affected by the eager @qdrant peer and can run anywhere Node + the DB
 * are reachable.
 *
 * TWO PHASES:
 *   Phase 1 — CONFLICT GATE. For every Excel row dated on/after the app start
 *     (MIN(sighting.date)), check whether `sighting` already has a sighting
 *     with the SAME date + species + time within ±tolerance minutes. If ANY
 *     conflict is found the import ABORTS and writes nothing — the conflicts
 *     must be clarified first.
 *   Phase 2 — IMPORT. Map every row to a sighting_old record. Dry-run by
 *     default (no writes); pass --commit to insert. Idempotent on
 *     (source_file, source_row).
 *
 * Usage:
 *   node backend/scripts/import-sighting-old.cjs \
 *     --excel "data/<historical-export>.xlsx" \
 *     --host 127.0.0.1 --port 3306 --user root --password <pw> --database mwpa \
 *     [--tolerance 30] [--commit]
 *
 * --excel is REQUIRED (the source workbook lives under the gitignored data/
 * dir and is never committed).
 *
 * The `sighting_old` table must already exist (created by the backend on boot
 * from the SightingOld entity). The script refuses to insert otherwise.
 */
'use strict';

const path = require('node:path');
const crypto = require('node:crypto');
const mysql = require(path.join(__dirname, '../../node_modules/mysql2/promise'));
const ExcelJS = require(path.join(__dirname, '../../node_modules/exceljs'));

// --- args -----------------------------------------------------------------
const ARGV = process.argv.slice(2);
const arg = (name, def) => {
    const i = ARGV.indexOf(`--${name}`);
    return i >= 0 && i + 1 < ARGV.length ? ARGV[i + 1] : def;
};
const has = (name) => ARGV.includes(`--${name}`);

const OPT = {
    excel: arg('excel', ''),
    host: arg('host', '127.0.0.1'),
    port: parseInt(arg('port', '3307'), 10),
    user: arg('user', 'root'),
    password: arg('password', 'test'),
    database: arg('database', 'mwpa'),
    tolerance: parseInt(arg('tolerance', '30'), 10),
    commit: has('commit')
};

// --- table DDL (entity-matching; only used if the table is missing) --------
const U = 'CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci';
const CREATE_TABLE_SQL = `CREATE TABLE IF NOT EXISTS sighting_old (
    id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    unid VARCHAR(255) NOT NULL DEFAULT '',
    creater_id INT NOT NULL DEFAULT 0,
    create_datetime INT NOT NULL DEFAULT 0,
    update_datetime INT NOT NULL DEFAULT 0,
    device_id INT NOT NULL DEFAULT 0,
    vehicle_id INT NOT NULL DEFAULT 0,
    vehicle_driver_id INT NOT NULL DEFAULT 0,
    beaufort_wind INT NOT NULL DEFAULT 0,
    beaufort_wind_n VARCHAR(255) ${U} NOT NULL DEFAULT '',
    \`date\` VARCHAR(255) NOT NULL DEFAULT '',
    tour_id INT NOT NULL DEFAULT 0,
    tour_fid VARCHAR(255) NOT NULL DEFAULT '',
    tour_start VARCHAR(255) NOT NULL DEFAULT '',
    tour_end VARCHAR(255) NOT NULL DEFAULT '',
    duration_from VARCHAR(255) NOT NULL DEFAULT '',
    duration_until VARCHAR(255) NOT NULL DEFAULT '',
    location_begin TEXT ${U} NULL,
    location_end TEXT ${U} NULL,
    photo_taken INT NOT NULL DEFAULT 0,
    distance_coast VARCHAR(255) NOT NULL DEFAULT '',
    distance_coast_estimation_gps INT NOT NULL DEFAULT 0,
    species_id INT NOT NULL DEFAULT 0,
    species_count INT NOT NULL DEFAULT 0,
    juveniles INT NOT NULL DEFAULT 0,
    calves INT NOT NULL DEFAULT 0,
    newborns INT NOT NULL DEFAULT 0,
    behaviours VARCHAR(255) ${U} NOT NULL DEFAULT '',
    subgroups INT NOT NULL DEFAULT 0,
    group_structure_id INT NOT NULL DEFAULT 0,
    reaction_id INT NOT NULL DEFAULT 0,
    freq_behaviour TEXT ${U} NOT NULL DEFAULT '',
    recognizable_animals TEXT ${U} NOT NULL DEFAULT '',
    other_species TEXT ${U} NOT NULL DEFAULT '',
    other TEXT ${U} NOT NULL DEFAULT '',
    other_vehicle TEXT ${U} NOT NULL DEFAULT '',
    note TEXT ${U} NOT NULL DEFAULT '',
    organization_id INT NOT NULL DEFAULT 0,
    sighting_type INT NOT NULL DEFAULT 0,
    deleted TINYINT NOT NULL DEFAULT 0,
    boat_name VARCHAR(128) ${U} NOT NULL DEFAULT '',
    skipper_name VARCHAR(128) ${U} NOT NULL DEFAULT '',
    species_name_raw VARCHAR(128) ${U} NOT NULL DEFAULT '',
    depth_m DECIMAL(7,1) NULL,
    source_file VARCHAR(256) NOT NULL DEFAULT '',
    source_row INT NOT NULL DEFAULT 0,
    INDEX idx_so_unid (unid),
    INDEX idx_so_species (species_id),
    INDEX idx_so_deleted (deleted),
    INDEX idx_so_source (source_file, source_row),
    INDEX idx_so_date (\`date\`)
)`;

// --- species resolution ----------------------------------------------------
const norm = (s) => String(s == null ? '' : s)
    .toLowerCase()
    .replace(/[`´'’]/gu, '')
    .replace(/[^a-z0-9]+/gu, ' ')
    .trim();

// Excel (normalized) → app species English name (normalized). Only the
// non-trivial ones; everything else resolves by the pre-comma English part.
const SYNONYM = {
    'short finned pilot whale': 'pilot whale',
    'spotted dolphin': 'atlantic spotted dolphin',
    'commons dolphins': 'common dolphin',
    'common dolphins': 'common dolphin',
    'cuvier beaked whale': 'cuviers beaked whale',
    'unidentified whale': 'unknown',
    'unidentified dolphin': 'unknown',
    'unidentified cetaceen': 'unknown',
    'unidentified cetacean': 'unknown'
};

const buildResolver = (speciesRows) => {
    const engToId = new Map();
    for (const r of speciesRows) {
        engToId.set(norm(String(r.name).split(',')[0]), r.id);
    }
    const unresolved = new Map();
    return {
        resolve(raw) {
            const n = norm(raw);
            if (n === '') {
                return 0;
            }
            // mixed "x / y" → cannot resolve to a single species
            if (n.includes(' / ') || /\bor\b/u.test(n)) {
                unresolved.set(raw, (unresolved.get(raw) || 0) + 1);
                return 0;
            }
            const key = SYNONYM[n] || n;
            const id = engToId.get(key);
            if (id === undefined) {
                unresolved.set(raw, (unresolved.get(raw) || 0) + 1);
                return 0;
            }
            return id;
        },
        unresolved
    };
};

// --- value helpers ---------------------------------------------------------
const toIsoDate = (v) => (v instanceof Date ? v.toISOString().slice(0, 10) : null);
const toHHmm = (v) => {
    if (!(v instanceof Date)) {
        return '';
    }
    const h = String(v.getUTCHours()).padStart(2, '0');
    const m = String(v.getUTCMinutes()).padStart(2, '0');
    return `${h}:${m}`;
};
const minutesOf = (hhmm) => {
    const m = (/^(\d{1,2}):(\d{2})/u).exec(hhmm || '');
    return m ? (parseInt(m[1], 10) * 60) + parseInt(m[2], 10) : null;
};
const numOrNull = (v) => {
    if (v == null || `${v}`.trim() === '') {
        return null;
    }
    const n = typeof v === 'number' ? v : parseFloat(`${v}`.replace(',', '.'));
    return Number.isFinite(n) ? n : null;
};
const intOr = (v, def) => {
    const n = numOrNull(v);
    return n == null ? def : Math.round(n);
};
const str = (v) => (v == null ? '' : `${v}`).trim().replace(/^\s*$/u, '');
const yesTo1 = (v) => (/^(yes|ja|1|x|true)$/iu.test(str(v)) ? 1 : 0);

// Columns (1-based, data_fusion sheet)
const C = {
    SIGHTING: 1, DATE: 2, BEGIN: 3, END: 4, BOAT: 5, SKIPPER: 6, SEASTATE: 7, SWELL: 8,
    SPECIES: 9, GROUP: 10, SUBGROUPS: 11, TIME: 12, DURATION: 13,
    POSN: 14, POSW: 15, LATDD: 16, LONDD: 17,
    POSN2: 18, POSW2: 19, LATDD2: 20, LONDD2: 21,
    DIST: 22, DEPTH: 23, JUV_P: 24, CAL_P: 25, NEW_P: 26, BEHAV: 27, TRAVEL: 28,
    ENCOUNTER: 33, EVENTS: 34, INTERACTION: 35, OTHER_SP: 41, NBOATS: 43, NOTES: 44,
    JUV_N: 50, CAL_N: 51, NEW_N: 52, SOURCE: 64
};

const buildNote = (row) => {
    const parts = [];
    const add = (label, v) => {
        const s = str(v);
        if (s !== '' && s !== '0') {
            parts.push(`${label}: ${s}`);
        }
    };
    add('Notes', row.getCell(C.NOTES).value);
    add('Swell', row.getCell(C.SWELL).value);
    add('Travel', row.getCell(C.TRAVEL).value);
    add('Encounter', row.getCell(C.ENCOUNTER).value);
    add('Events', row.getCell(C.EVENTS).value);
    add('Interaction', row.getCell(C.INTERACTION).value);
    add('Boats', row.getCell(C.NBOATS).value);
    return parts.join(' | ');
};

const LAT_LIMIT = 90;
const LON_LIMIT = 180;
// Dataset region (Canary Is. + the West-African coast). Coordinates outside are
// kept but flagged for review — geographically possible, just unusually far.
const REGION = {latMin: 5, latMax: 35, lonMin: -25, lonMax: -5};

// Coordinate diagnostics, printed in the run summary.
const coordNotes = [];

// Parse a POSITION_N/_W cell to a magnitude in decimal degrees. The source
// format is `DD.MM.mmm` text (degrees + decimal minutes, e.g. "17.08.52" =
// 17°08.52'). Some rows lost the dots and are stored as a plain number, e.g.
// 171493 = 17°14.93' — reconstruct those from a 6/7-digit DDMMmm(m). Returns
// null when the value can't be read unambiguously.
const dmToDD = (v) => {
    if (v == null) {
        return null;
    }
    const s = `${v}`.trim();
    if (s === '') {
        return null;
    }
    let deg;
    let minStr;
    if (/^\d+$/u.test(s)) {
        if (s.length < 6 || s.length > 7) {
            return null;
        }
        deg = parseInt(s.slice(0, 2), 10);
        minStr = `${s.slice(2, 4)}.${s.slice(4)}`;
    } else {
        const dot = s.indexOf('.');
        if (dot < 0) {
            return null;
        }
        deg = parseInt(s.slice(0, dot), 10);
        minStr = s.slice(dot + 1);
    }
    const min = parseFloat(minStr);
    if (!Number.isFinite(deg) || !Number.isFinite(min) || min < 0 || min >= 60) {
        return null;
    }
    return deg + (min / 60);
};

// Resolve one axis: trust the pre-computed GdM DD value, but when it is
// physically impossible (a broken DD conversion in the source) recover it from
// the raw POSITION cell. Returns the signed decimal degrees, or null to drop.
const resolveAxis = (ddCell, rawCell, limit, sign, label) => {
    const dd = numOrNull(ddCell);
    if (dd == null) {
        return null;
    }
    if (Math.abs(dd) <= limit) {
        return dd;
    }
    const mag = dmToDD(rawCell);
    if (mag != null && mag <= limit) {
        const fixed = sign * mag;
        coordNotes.push(`${label}: recovered ${dd} -> ${fixed.toFixed(5)} from raw "${rawCell}"`);

        return fixed;
    }
    coordNotes.push(`${label}: DROPPED (impossible ${dd}, raw "${rawCell}" not recoverable)`);

    return null;
};

const inRegion = (lat, lon) =>
    lat >= REGION.latMin && lat <= REGION.latMax &&
    lon >= REGION.lonMin && lon <= REGION.lonMax;

// Parse both axes to signed decimal degrees (recovering / dropping impossible
// values per resolveAxis). Returns {lat, lon} or null.
const parseCoord = (latDD, lonDD, rawLat, rawLon, label) => {
    const lat = resolveAxis(latDD, rawLat, LAT_LIMIT, 1, `${label} lat`);
    const lon = resolveAxis(lonDD, rawLon, LON_LIMIT, -1, `${label} lon`);
    if (lat == null || lon == null) {
        return null;
    }

    return {lat: lat, lon: lon};
};

// Maximum distance (degrees) a cross-check-recovered endpoint may sit from its
// anchor; a sighting's begin/end are the same short tour, so a correct value
// stays close (~0.5° ≈ 55 km is already generous for these coastal trips).
const CROSS_MAX_DELTA = 0.5;

// Fix a single axis whose integer degree is a data-entry typo (e.g. an end lon
// "27°21.68" whose degree should be 17, matching the begin) by borrowing the
// anchor's degree and keeping the suspicious value's own minutes. Returns the
// corrected signed value, or null when it would not land near the anchor.
const fixAxisByAnchor = (bad, anchor) => {
    const minutesFrac = Math.abs(bad) - Math.floor(Math.abs(bad));
    const cand = Math.sign(anchor) * (Math.floor(Math.abs(anchor)) + minutesFrac);
    if (Math.abs(cand - anchor) <= CROSS_MAX_DELTA) {
        return cand;
    }

    return null;
};

// Return a single axis unchanged when it is already within [min, max]; only an
// out-of-range axis is handed to the anchor-based degree-typo fix.
const recoverAxis = (value, anchor, min, max) => {
    if (value >= min && value <= max) {
        return value;
    }
    const fixed = fixAxisByAnchor(value, anchor);

    return fixed == null ? value : fixed;
};

// Cross-check an out-of-region endpoint against the other (in-region) endpoint
// of the same sighting and recover an unambiguous degree typo. Deliberately
// skips the lon==lat copy error (there is no real longitude to recover) and any
// candidate that would not land both in-region and near the anchor. Returns a
// possibly-corrected {lat, lon}.
const crossRecover = (coord, anchor, label) => {
    if (coord == null || anchor == null) {
        return coord;
    }
    if (inRegion(coord.lat, coord.lon) || !inRegion(anchor.lat, anchor.lon)) {
        return coord;
    }
    // lon was copied from lat (identical magnitudes) — nothing real to rebuild.
    if (Math.abs(Math.abs(coord.lon) - Math.abs(coord.lat)) < 1e-6) {
        return coord;
    }
    const lon = recoverAxis(coord.lon, anchor.lon, REGION.lonMin, REGION.lonMax);
    const lat = recoverAxis(coord.lat, anchor.lat, REGION.latMin, REGION.latMax);
    if ((lat !== coord.lat || lon !== coord.lon) && inRegion(lat, lon)) {
        coordNotes.push(`${label}: recovered degree typo ${coord.lat.toFixed(5)}/${coord.lon.toFixed(5)} -> ${lat.toFixed(5)}/${lon.toFixed(5)} via the other endpoint`);

        return {lat: lat, lon: lon};
    }

    return coord;
};

// Serialize a parsed coordinate, flagging (keeping) anything still outside the
// dataset region for manual review.
const finalizeCoord = (coord, label) => {
    if (coord == null) {
        return null;
    }
    if (!inRegion(coord.lat, coord.lon)) {
        coordNotes.push(`${label}: SUSPECT (kept) lat ${coord.lat} lon ${coord.lon} — far outside the dataset region, verify`);
    }

    return JSON.stringify({latitude: coord.lat, longitude: coord.lon});
};

// --- main ------------------------------------------------------------------
(async () => {
    if (OPT.excel === '') {
        console.error('ERR: --excel <path-to-workbook> is required (the source file is not in the repo).');
        process.exit(1);
        return;
    }

    const db = await mysql.createConnection({
        host: OPT.host, port: OPT.port, user: OPT.user, password: OPT.password, database: OPT.database
    });

    const [speciesRows] = await db.execute('SELECT id, name FROM species');
    const resolver = buildResolver(speciesRows);
    const idToEng = new Map(speciesRows.map((r) => [r.id, norm(String(r.name).split(',')[0])]));

    const [[{ appStart }]] = await db.query(
        'SELECT MIN(date) AS appStart FROM sighting WHERE deleted = 0'
    );
    const appStartIso = appStart ? String(appStart).slice(0, 10) : '9999-12-31';

    // App sightings in the overlap window, indexed by date for conflict check.
    const [appRows] = await db.execute(
        'SELECT date, duration_from, species_id FROM sighting WHERE deleted = 0 AND date >= ?',
        [appStartIso]
    );
    const appByDate = new Map();
    for (const r of appRows) {
        const d = String(r.date).slice(0, 10);
        if (!appByDate.has(d)) {
            appByDate.set(d, []);
        }
        appByDate.get(d).push({ min: minutesOf(String(r.duration_from || '').slice(0, 5)), sp: r.species_id });
    }

    const wb = new ExcelJS.Workbook();
    await wb.xlsx.readFile(OPT.excel);
    const ws = wb.worksheets[0];
    const sourceFile = path.basename(OPT.excel);

    // ---- Phase 1: conflict gate --------------------------------------------
    const conflicts = [];
    for (let r = 2; r <= ws.rowCount; r++) {
        const row = ws.getRow(r);
        const iso = toIsoDate(row.getCell(C.DATE).value);
        if (iso == null || iso < appStartIso) {
            continue;
        }
        const spId = resolver.resolve(row.getCell(C.SPECIES).value);
        if (spId === 0) {
            continue;
        }
        const tmin = minutesOf(toHHmm(row.getCell(C.TIME).value));
        const cand = appByDate.get(iso) || [];
        const hit = cand.some((c) => c.sp === spId && c.min != null && tmin != null && Math.abs(c.min - tmin) <= OPT.tolerance);
        if (hit) {
            conflicts.push(`row ${r}: ${iso} ${toHHmm(row.getCell(C.TIME).value)} "${str(row.getCell(C.SPECIES).value)}" (species_id ${spId})`);
        }
    }

    console.log('='.repeat(60));
    console.log('PHASE 1 — Konflikt-Gate');
    console.log(`  App-Start (MIN sighting.date): ${appStartIso}`);
    console.log(`  Toleranz: ±${OPT.tolerance} min`);
    console.log(`  Konflikte (Datum+Tier+Uhrzeit): ${conflicts.length}`);
    if (conflicts.length > 0) {
        conflicts.slice(0, 50).forEach((c) => console.log(`    ✖ ${c}`));
        console.log('ABBRUCH — Konflikte zuerst klären, es wurde NICHTS importiert.');
        await db.end();
        process.exit(2);
        return;
    }
    console.log('  → keine Konflikte, Import darf laufen.');

    // ---- Phase 2: map + import ---------------------------------------------
    // table present?
    const [tbl] = await db.query(
        'SELECT COUNT(*) AS c FROM information_schema.tables WHERE table_schema = ? AND table_name = ?',
        [OPT.database, 'sighting_old']
    );
    const tableExists = tbl[0].c > 0;

    // idempotency: existing (source_file, source_row)
    const existing = new Set();
    if (tableExists) {
        const [ex] = await db.execute('SELECT source_row FROM sighting_old WHERE source_file = ?', [sourceFile]);
        ex.forEach((e) => existing.add(e.source_row));
    }

    let mapped = 0;
    let skippedNoDate = 0;
    let skippedExisting = 0;
    let withCoords = 0;
    let unresolvedSpecies = 0;
    const records = [];

    for (let r = 2; r <= ws.rowCount; r++) {
        const row = ws.getRow(r);
        const iso = toIsoDate(row.getCell(C.DATE).value);
        if (iso == null) {
            skippedNoDate++;
            continue;
        }
        const sourceRow = intOr(row.getCell(C.SIGHTING).value, r);
        if (existing.has(sourceRow)) {
            skippedExisting++;
            continue;
        }
        const spId = resolver.resolve(row.getCell(C.SPECIES).value);
        if (spId === 0 && str(row.getCell(C.SPECIES).value) !== '') {
            unresolvedSpecies++;
        }
        let beginCoord = parseCoord(
            row.getCell(C.LATDD).value, row.getCell(C.LONDD).value,
            row.getCell(C.POSN).value, row.getCell(C.POSW).value, `row ${sourceRow} begin`
        );
        let endCoord = parseCoord(
            row.getCell(C.LATDD2).value, row.getCell(C.LONDD2).value,
            row.getCell(C.POSN2).value, row.getCell(C.POSW2).value, `row ${sourceRow} end`
        );
        beginCoord = crossRecover(beginCoord, endCoord, `row ${sourceRow} begin`);
        endCoord = crossRecover(endCoord, beginCoord, `row ${sourceRow} end`);
        const loc = finalizeCoord(beginCoord, `row ${sourceRow} begin`);
        if (loc != null) {
            withCoords++;
        }
        const juvN = numOrNull(row.getCell(C.JUV_N).value);
        const calN = numOrNull(row.getCell(C.CAL_N).value);
        const newN = numOrNull(row.getCell(C.NEW_N).value);

        records.push({
            unid: crypto.randomUUID(),
            date: iso,
            duration_from: toHHmm(row.getCell(C.TIME).value),
            location_begin: loc,
            location_end: finalizeCoord(endCoord, `row ${sourceRow} end`),
            species_id: spId,
            species_name_raw: str(row.getCell(C.SPECIES).value).slice(0, 128),
            species_count: intOr(row.getCell(C.GROUP).value, 0),
            subgroups: intOr(row.getCell(C.SUBGROUPS).value, 0),
            juveniles: juvN != null && juvN > 0 ? Math.round(juvN) : yesTo1(row.getCell(C.JUV_P).value),
            calves: calN != null && calN > 0 ? Math.round(calN) : yesTo1(row.getCell(C.CAL_P).value),
            newborns: newN != null && newN > 0 ? Math.round(newN) : yesTo1(row.getCell(C.NEW_P).value),
            beaufort_wind: intOr(row.getCell(C.SEASTATE).value, 0),
            distance_coast: str(row.getCell(C.DIST).value),
            depth_m: numOrNull(row.getCell(C.DEPTH).value),
            behaviours: str(row.getCell(C.BEHAV).value).slice(0, 255),
            other_species: str(row.getCell(C.OTHER_SP).value),
            note: buildNote(row),
            boat_name: str(row.getCell(C.BOAT).value).slice(0, 128),
            skipper_name: str(row.getCell(C.SKIPPER).value).slice(0, 128),
            tour_start: '',
            tour_end: '',
            source_file: sourceFile,
            source_row: sourceRow
        });
        mapped++;
    }

    console.log('='.repeat(60));
    console.log('PHASE 2 — Mapping' + (OPT.commit ? ' + Import' : ' (DRY-RUN)'));
    console.log(`  Zeilen gesamt (data): ${ws.rowCount - 1}`);
    console.log(`  importierbar (mit Datum, neu): ${mapped}`);
    console.log(`  übersprungen — kein Datum: ${skippedNoDate}`);
    console.log(`  übersprungen — schon importiert: ${skippedExisting}`);
    console.log(`  davon mit Koordinaten: ${withCoords} (${Math.round(withCoords / Math.max(mapped, 1) * 100)}%)`);
    console.log(`  unaufgelöste Species (id 0, raw erhalten): ${unresolvedSpecies}`);
    if (resolver.unresolved.size > 0) {
        console.log('  unaufgelöste Artnamen:');
        [...resolver.unresolved.entries()].sort((a, b) => b[1] - a[1]).slice(0, 20)
            .forEach(([k, n]) => console.log(`     ${n}x  "${k}"`));
    }
    if (coordNotes.length > 0) {
        console.log(`  Koordinaten-Korrekturen/Hinweise (${coordNotes.length}):`);
        coordNotes.forEach((n) => console.log(`     - ${n}`));
    }
    if (records.length > 0) {
        console.log('  Beispiel-Record:', JSON.stringify(records[0]).slice(0, 300));
    }

    if (!OPT.commit) {
        console.log('\nDRY-RUN — nichts geschrieben. Mit --commit ausführen zum Import.');
        await db.end();
        return;
    }
    if (!tableExists) {
        console.log('  Tabelle `sighting_old` fehlt — lege sie an (entity-getreu; der echte Backend-Boot gleicht per synchronize additiv ab).');
        await db.query(CREATE_TABLE_SQL);
    }

    // batch insert (columns backticked — `date` etc. are reserved-ish)
    const cols = Object.keys(records[0]);
    const colList = cols.map((c) => `\`${c}\``).join(',');
    const CHUNK = 500;
    let inserted = 0;
    for (let i = 0; i < records.length; i += CHUNK) {
        const chunk = records.slice(i, i + CHUNK);
        const placeholders = chunk.map(() => `(${cols.map(() => '?').join(',')})`).join(',');
        const values = chunk.flatMap((rec) => cols.map((c) => rec[c]));
        // eslint-disable-next-line no-await-in-loop
        await db.query(`INSERT INTO sighting_old (${colList}) VALUES ${placeholders}`, values);
        inserted += chunk.length;
        console.log(`  inserted ${inserted}/${records.length}`);
    }
    console.log(`\nFERTIG — ${inserted} Zeilen in sighting_old importiert.`);
    await db.end();
})().catch((e) => {
    console.error('ERR', e.message);
    process.exit(1);
});
