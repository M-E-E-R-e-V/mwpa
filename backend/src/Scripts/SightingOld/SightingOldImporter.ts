import crypto from 'node:crypto';
import path from 'node:path';
import ExcelJS from 'exceljs';
import mysql from 'mysql2/promise.js';
import {CoordResolver} from './CoordResolver.js';
import {ImportValue} from './ImportValue.js';
import {SpeciesResolver, SpeciesRow} from './SpeciesResolver.js';

/**
 * CLI options of the importer.
 */
export type SightingOldImportOptions = {
    excel: string;
    host: string;
    port: number;
    user: string;
    password: string;
    database: string;
    tolerance: number;
    commit: boolean;
};

/**
 * One row written into `sighting_old` (column name → value).
 */
export type SightingOldRecord = {
    unid: string;
    date: string;
    duration_from: string;
    location_begin: string | null;
    location_end: string | null;
    species_id: number;
    species_name_raw: string;
    species_count: number;
    subgroups: number;
    juveniles: number;
    calves: number;
    newborns: number;
    beaufort_wind: number;
    distance_coast: string;
    depth_m: number | null;
    behaviours: string;
    other_species: string;
    note: string;
    boat_name: string;
    skipper_name: string;
    tour_start: string;
    tour_end: string;
    source_file: string;
    source_row: number;
};

/**
 * Phase-2 mapping counters.
 */
export type SightingOldMapStats = {
    mapped: number;
    skippedNoDate: number;
    skippedExisting: number;
    withCoords: number;
    unresolvedSpecies: number;
};

/**
 * Conflict-gate index entry: start minute-of-day + species id of an app sighting.
 */
type AppSightingKey = {
    min: number | null;
    sp: number;
};

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
 */
export class SightingOldImporter {

    /**
     * Columns (1-based, data_fusion sheet).
     */
    public static readonly C = {
        SIGHTING: 1,
        DATE: 2,
        BEGIN: 3,
        END: 4,
        BOAT: 5,
        SKIPPER: 6,
        SEASTATE: 7,
        SWELL: 8,
        SPECIES: 9,
        GROUP: 10,
        SUBGROUPS: 11,
        TIME: 12,
        DURATION: 13,
        POSN: 14,
        POSW: 15,
        LATDD: 16,
        LONDD: 17,
        POSN2: 18,
        POSW2: 19,
        LATDD2: 20,
        LONDD2: 21,
        DIST: 22,
        DEPTH: 23,
        JUV_P: 24,
        CAL_P: 25,
        NEW_P: 26,
        BEHAV: 27,
        TRAVEL: 28,
        ENCOUNTER: 33,
        EVENTS: 34,
        INTERACTION: 35,
        OTHER_SP: 41,
        NBOATS: 43,
        NOTES: 44,
        JUV_N: 50,
        CAL_N: 51,
        NEW_N: 52,
        SOURCE: 64
    } as const;

    public static readonly INSERT_CHUNK = 500;

    /**
     * Table DDL (entity-matching; only used if the table is missing).
     */
    public static readonly CREATE_TABLE_SQL = SightingOldImporter._buildCreateTableSql();

    private readonly _opt: SightingOldImportOptions;

    private readonly _coords: CoordResolver = new CoordResolver();

    public constructor(opt: SightingOldImportOptions) {
        this._opt = opt;
    }

    /**
     * Parse `--name value` / `--flag` style CLI args.
     */
    public static parseArgs(argv: string[]): SightingOldImportOptions {
        const arg = (name: string, def: string): string => {
            const i = argv.indexOf(`--${name}`);
            return i >= 0 && i + 1 < argv.length ? argv[i + 1] : def;
        };

        return {
            excel: arg('excel', ''),
            host: arg('host', '127.0.0.1'),
            port: parseInt(arg('port', '3307'), 10),
            user: arg('user', 'root'),
            password: arg('password', 'test'),
            database: arg('database', 'mwpa'),
            tolerance: parseInt(arg('tolerance', '30'), 10),
            commit: argv.includes('--commit')
        };
    }

    /**
     * Build the conflict-gate index: date 'YYYY-MM-DD' -> [{min, sp}] of app rows.
     */
    public static buildAppByDate(appRows: mysql.RowDataPacket[]): Map<string, AppSightingKey[]> {
        const appByDate = new Map<string, AppSightingKey[]>();

        for (const r of appRows) {
            const d = String(r.date).slice(0, 10);
            let list = appByDate.get(d);

            if (list === undefined) {
                list = [];
                appByDate.set(d, list);
            }

            list.push({
                min: ImportValue.minutesOf(String(r.duration_from ?? '').slice(0, 5)),
                sp: Number(r.species_id)
            });
        }

        return appByDate;
    }

    /**
     * Collect the secondary free-text columns into one `note` string.
     */
    public static buildNote(row: ExcelJS.Row): string {
        const C = SightingOldImporter.C;
        const parts: string[] = [];
        const add = (label: string, v: unknown): void => {
            const s = ImportValue.str(v);

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
    }

    /**
     * Count from the explicit `_N` column when present, else the yes/no `_P` flag.
     */
    private static _countOrFlag(nCell: unknown, pCell: unknown): number {
        const n = ImportValue.numOrNull(nCell);

        return n !== null && n > 0 ? Math.round(n) : ImportValue.yesTo1(pCell);
    }

    private static _buildCreateTableSql(): string {
        const U = 'CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci';

        return `CREATE TABLE IF NOT EXISTS sighting_old (
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
    }

    /**
     * Run both phases. Returns the process exit code
     * (0 = ok / dry-run, 1 = usage error, 2 = conflict gate aborted).
     */
    public async run(): Promise<number> {
        if (this._opt.excel === '') {
            console.error('ERR: --excel <path-to-workbook> is required (the source file is not in the repo).');
            return 1;
        }

        const db = await mysql.createConnection({
            host: this._opt.host,
            port: this._opt.port,
            user: this._opt.user,
            password: this._opt.password,
            database: this._opt.database
        });

        try {
            return await this._runWithDb(db);
        } finally {
            await db.end();
        }
    }

    /**
     * Phase 1: spreadsheet rows that collide with an existing app sighting
     * (same day + species + start time within tolerance). Returns readable
     * descriptions.
     */
    public findConflicts(
        ws: ExcelJS.Worksheet,
        resolver: SpeciesResolver,
        appByDate: Map<string, AppSightingKey[]>,
        appStartIso: string
    ): string[] {
        const C = SightingOldImporter.C;
        const tolerance = this._opt.tolerance;
        const conflicts: string[] = [];

        for (let r = 2; r <= ws.rowCount; r++) {
            const row = ws.getRow(r);
            const iso = ImportValue.toIsoDate(row.getCell(C.DATE).value);

            if (iso === null || iso < appStartIso) {
                continue;
            }

            const spId = resolver.resolve(row.getCell(C.SPECIES).value);

            if (spId === 0) {
                continue;
            }

            const hhmm = ImportValue.toHHmm(row.getCell(C.TIME).value);
            const tmin = ImportValue.minutesOf(hhmm);
            const cand = appByDate.get(iso) ?? [];
            const hit = cand.some((c) => c.sp === spId && c.min !== null && tmin !== null && Math.abs(c.min - tmin) <= tolerance);

            if (hit) {
                conflicts.push(`row ${r}: ${iso} ${hhmm} "${ImportValue.str(row.getCell(C.SPECIES).value)}" (species_id ${spId})`);
            }
        }

        return conflicts;
    }

    /**
     * Phase 2: iterate the data rows into records, skipping dateless + already
     * imported ones.
     */
    public mapRows(
        ws: ExcelJS.Worksheet,
        resolver: SpeciesResolver,
        existing: Set<number>,
        sourceFile: string
    ): {records: SightingOldRecord[]; stats: SightingOldMapStats;} {
        const C = SightingOldImporter.C;
        const stats: SightingOldMapStats = {
            mapped: 0,
            skippedNoDate: 0,
            skippedExisting: 0,
            withCoords: 0,
            unresolvedSpecies: 0
        };
        const records: SightingOldRecord[] = [];

        for (let r = 2; r <= ws.rowCount; r++) {
            const row = ws.getRow(r);
            const iso = ImportValue.toIsoDate(row.getCell(C.DATE).value);

            if (iso === null) {
                stats.skippedNoDate++;
                continue;
            }

            const sourceRow = ImportValue.intOr(row.getCell(C.SIGHTING).value, r);

            if (existing.has(sourceRow)) {
                stats.skippedExisting++;
                continue;
            }

            const spId = resolver.resolve(row.getCell(C.SPECIES).value);

            if (spId === 0 && ImportValue.str(row.getCell(C.SPECIES).value) !== '') {
                stats.unresolvedSpecies++;
            }

            const rec = this.buildRecord(row, iso, sourceRow, spId, sourceFile);

            if (rec.location_begin !== null) {
                stats.withCoords++;
            }

            records.push(rec);
            stats.mapped++;
        }

        return {records: records, stats: stats};
    }

    /**
     * Map one spreadsheet row to a sighting_old record.
     */
    public buildRecord(row: ExcelJS.Row, iso: string, sourceRow: number, spId: number, sourceFile: string): SightingOldRecord {
        const C = SightingOldImporter.C;
        const v = (col: number): unknown => row.getCell(col).value;
        const loc = this._rowLocations(row, sourceRow);

        return {
            unid: crypto.randomUUID(),
            date: iso,
            duration_from: ImportValue.toHHmm(v(C.TIME)),
            location_begin: loc.begin,
            location_end: loc.end,
            species_id: spId,
            species_name_raw: ImportValue.str(v(C.SPECIES)).slice(0, 128),
            species_count: ImportValue.intOr(v(C.GROUP), 0),
            subgroups: ImportValue.intOr(v(C.SUBGROUPS), 0),
            juveniles: SightingOldImporter._countOrFlag(v(C.JUV_N), v(C.JUV_P)),
            calves: SightingOldImporter._countOrFlag(v(C.CAL_N), v(C.CAL_P)),
            newborns: SightingOldImporter._countOrFlag(v(C.NEW_N), v(C.NEW_P)),
            beaufort_wind: ImportValue.intOr(v(C.SEASTATE), 0),
            distance_coast: ImportValue.str(v(C.DIST)),
            depth_m: ImportValue.numOrNull(v(C.DEPTH)),
            behaviours: ImportValue.str(v(C.BEHAV)).slice(0, 255),
            other_species: ImportValue.str(v(C.OTHER_SP)),
            note: SightingOldImporter.buildNote(row),
            boat_name: ImportValue.str(v(C.BOAT)).slice(0, 128),
            skipper_name: ImportValue.str(v(C.SKIPPER)).slice(0, 128),
            tour_start: '',
            tour_end: '',
            source_file: sourceFile,
            source_row: sourceRow
        };
    }

    private async _runWithDb(db: mysql.Connection): Promise<number> {
        const [speciesRows] = await db.execute<mysql.RowDataPacket[]>('SELECT id, name FROM species');
        const resolver = new SpeciesResolver(speciesRows.map((r): SpeciesRow => ({id: Number(r.id), name: String(r.name)})));

        const [startRows] = await db.query<mysql.RowDataPacket[]>(
            'SELECT MIN(date) AS appStart FROM sighting WHERE deleted = 0'
        );
        const appStart: unknown = startRows[0]?.appStart;
        const appStartIso = appStart ? String(appStart).slice(0, 10) : '9999-12-31';

        // App sightings in the overlap window, indexed by date for conflict check.
        const [appRows] = await db.execute<mysql.RowDataPacket[]>(
            'SELECT date, duration_from, species_id FROM sighting WHERE deleted = 0 AND date >= ?',
            [appStartIso]
        );
        const appByDate = SightingOldImporter.buildAppByDate(appRows);

        const wb = new ExcelJS.Workbook();
        await wb.xlsx.readFile(this._opt.excel);
        const ws = wb.worksheets[0];
        const sourceFile = path.basename(this._opt.excel);

        // ---- Phase 1: conflict gate ----------------------------------------
        const conflicts = this.findConflicts(ws, resolver, appByDate, appStartIso);

        console.log('='.repeat(60));
        console.log('PHASE 1 — Konflikt-Gate');
        console.log(`  App-Start (MIN sighting.date): ${appStartIso}`);
        console.log(`  Toleranz: ±${this._opt.tolerance} min`);
        console.log(`  Konflikte (Datum+Tier+Uhrzeit): ${conflicts.length}`);

        if (conflicts.length > 0) {
            conflicts.slice(0, 50).forEach((c) => console.log(`    ✖ ${c}`));
            console.log('ABBRUCH — Konflikte zuerst klären, es wurde NICHTS importiert.');
            return 2;
        }

        console.log('  → keine Konflikte, Import darf laufen.');

        // ---- Phase 2: map + import -----------------------------------------
        const [tbl] = await db.query<mysql.RowDataPacket[]>(
            'SELECT COUNT(*) AS c FROM information_schema.tables WHERE table_schema = ? AND table_name = ?',
            [this._opt.database, 'sighting_old']
        );
        const tableExists = Number(tbl[0].c) > 0;

        // idempotency: existing (source_file, source_row)
        const existing = new Set<number>();

        if (tableExists) {
            const [ex] = await db.execute<mysql.RowDataPacket[]>(
                'SELECT source_row FROM sighting_old WHERE source_file = ?',
                [sourceFile]
            );
            ex.forEach((e) => existing.add(Number(e.source_row)));
        }

        const {records, stats} = this.mapRows(ws, resolver, existing, sourceFile);
        this._printSummary(ws, stats, resolver, records);

        if (!this._opt.commit) {
            console.log('\nDRY-RUN — nichts geschrieben. Mit --commit ausführen zum Import.');
            return 0;
        }

        if (!tableExists) {
            console.log('  Tabelle `sighting_old` fehlt — lege sie an (entity-getreu; der echte Backend-Boot gleicht per synchronize additiv ab).');
            await db.query(SightingOldImporter.CREATE_TABLE_SQL);
        }

        const inserted = await SightingOldImporter._insertRecords(db, records);
        console.log(`\nFERTIG — ${inserted} Zeilen in sighting_old importiert.`);

        return 0;
    }

    /**
     * Chunked batch insert (columns backticked — `date` etc. are reserved-ish).
     * Returns the number of rows written.
     */
    private static async _insertRecords(db: mysql.Connection, records: SightingOldRecord[]): Promise<number> {
        if (records.length === 0) {
            return 0;
        }

        const cols = Object.keys(records[0]) as (keyof SightingOldRecord)[];
        const colList = cols.map((c) => `\`${c}\``).join(',');
        const rowPlaceholder = `(${cols.map(() => '?').join(',')})`;
        let inserted = 0;

        for (let i = 0; i < records.length; i += SightingOldImporter.INSERT_CHUNK) {
            const chunk = records.slice(i, i + SightingOldImporter.INSERT_CHUNK);
            const placeholders = chunk.map(() => rowPlaceholder).join(',');
            const values = chunk.flatMap((rec) => cols.map((c) => rec[c]));

            // eslint-disable-next-line no-await-in-loop
            await db.query(`INSERT INTO sighting_old (${colList}) VALUES ${placeholders}`, values);
            inserted += chunk.length;
            console.log(`  inserted ${inserted}/${records.length}`);
        }

        return inserted;
    }

    /**
     * Resolve begin + end positions for one row, cross-checking the two endpoints.
     */
    private _rowLocations(row: ExcelJS.Row, sourceRow: number): {begin: string | null; end: string | null;} {
        const C = SightingOldImporter.C;
        const v = (col: number): unknown => row.getCell(col).value;

        let beginCoord = this._coords.parseCoord(v(C.LATDD), v(C.LONDD), v(C.POSN), v(C.POSW), `row ${sourceRow} begin`);
        let endCoord = this._coords.parseCoord(v(C.LATDD2), v(C.LONDD2), v(C.POSN2), v(C.POSW2), `row ${sourceRow} end`);

        beginCoord = this._coords.crossRecover(beginCoord, endCoord, `row ${sourceRow} begin`);
        endCoord = this._coords.crossRecover(endCoord, beginCoord, `row ${sourceRow} end`);

        return {
            begin: this._coords.finalizeCoord(beginCoord, `row ${sourceRow} begin`),
            end: this._coords.finalizeCoord(endCoord, `row ${sourceRow} end`)
        };
    }

    /**
     * Phase 2 report (shared by dry-run and commit).
     */
    private _printSummary(ws: ExcelJS.Worksheet, stats: SightingOldMapStats, resolver: SpeciesResolver, records: SightingOldRecord[]): void {
        const pct = Math.round(stats.withCoords / Math.max(stats.mapped, 1) * 100);

        console.log('='.repeat(60));
        console.log(`PHASE 2 — Mapping${this._opt.commit ? ' + Import' : ' (DRY-RUN)'}`);
        console.log(`  Zeilen gesamt (data): ${ws.rowCount - 1}`);
        console.log(`  importierbar (mit Datum, neu): ${stats.mapped}`);
        console.log(`  übersprungen — kein Datum: ${stats.skippedNoDate}`);
        console.log(`  übersprungen — schon importiert: ${stats.skippedExisting}`);
        console.log(`  davon mit Koordinaten: ${stats.withCoords} (${pct}%)`);
        console.log(`  unaufgelöste Species (id 0, raw erhalten): ${stats.unresolvedSpecies}`);

        if (resolver.unresolved.size > 0) {
            console.log('  unaufgelöste Artnamen:');
            [...resolver.unresolved.entries()]
            .sort((a, b) => b[1] - a[1])
            .slice(0, 20)
            .forEach(([k, n]) => console.log(`     ${n}x  "${k}"`));
        }

        if (this._coords.notes.length > 0) {
            console.log(`  Koordinaten-Korrekturen/Hinweise (${this._coords.notes.length}):`);
            this._coords.notes.forEach((n) => console.log(`     - ${n}`));
        }

        if (records.length > 0) {
            console.log('  Beispiel-Record:', JSON.stringify(records[0]).slice(0, 300));
        }
    }

}