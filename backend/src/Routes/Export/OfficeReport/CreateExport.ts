import fs from 'fs';
import JSZip from 'jszip';
import moment from 'moment';
import Path from 'path';
import {Logger} from 'figtree';
import {OfficeReportFilter} from 'mwpa_schemas';
import {Between, FindOptionsWhere, In, Raw} from 'typeorm';
import {Sighting as SightingDB} from '../../../Db/MariaDb/Entities/Sighting.js';
import {BehaviouralStates as BehaviouralStatesDB} from '../../../Db/MariaDb/Entities/BehaviouralStates.js';
import {EncounterCategories as EncounterCategoriesDB} from '../../../Db/MariaDb/Entities/EncounterCategories.js';
import {Vehicle as VehicleDB} from '../../../Db/MariaDb/Entities/Vehicle.js';
import {Organization as OrganizationDB} from '../../../Db/MariaDb/Entities/Organization.js';
import {BehaviouralStatesRepository} from '../../../Db/MariaDb/Repositories/BehaviouralStatesRepository.js';
import {EncounterCategoriesRepository} from '../../../Db/MariaDb/Repositories/EncounterCategoriesRepository.js';
import {OrganizationRepository} from '../../../Db/MariaDb/Repositories/OrganizationRepository.js';
import {SightingRepository} from '../../../Db/MariaDb/Repositories/SightingRepository.js';
import {SpeciesExternLinkRepository} from '../../../Db/MariaDb/Repositories/SpeciesExternLinkRepository.js';
import {UserRepository} from '../../../Db/MariaDb/Repositories/UserRepository.js';
import {VehicleRepository} from '../../../Db/MariaDb/Repositories/VehicleRepository.js';
import {UtilUploadPath} from '../../../Utils/UtilUploadPath.js';

const TEMPLATE_FILENAME = 'PLANTILLA_AVISTAMIENTOS_AROC.xlsx';
const SHEET_DATA_PATH = 'xl/worksheets/sheet3.xml'; // datos SALIDAS
const SHEET_GENERAL_PATH = 'xl/worksheets/sheet2.xml'; // datos GENERALES
const SHEET_LISTA_ESPECIES_PATH = 'xl/worksheets/sheet5.xml'; // ListaEspecies (defined name NOMBRE_COMUN = $B$3:$B$48)
const SHEET_SHARED_STRINGS_PATH = 'xl/sharedStrings.xml';
const FIRST_DATA_ROW = 2;

type ArocSpeciesIndex = {
    /** externid (AROC Taxon-ID from ListaEspecies!C, e.g. "20068") → NOMBRE_COMUN (B). */
    byExternId: Map<string, string>;
    /** Lowercased NOMBRE_COMUN → canonical NOMBRE_COMUN, for fallback name-only matches. */
    byNombreLower: Map<string, string>;
};

/**
 * Read the AROC `ListaEspecies` sheet at export time and build the lookup
 * map that drives column N (Nombre común).
 *
 * Why this exists: column P (Nombre científico) is filled by the template via
 * `IFERROR(VLOOKUP(N, ListaEspecies!$B$3:$D$45, 3, FALSE), "")` — N must match
 * one of `ListaEspecies!B3:B48` exactly or P stays blank, which AROC interprets
 * as a data-entry error. Our DB stores `species_extern_link.externname` per
 * receiver but it's hand-curated and drifted out of sync with the template, so
 * we treat the template itself as the source of truth and join on
 * `species_extern_link.externid`, which is meant to hold the AROC Taxon-ID
 * (column C in ListaEspecies). The lowercased-name map is a defensive fallback
 * for entries where externid hasn't been filled in.
 */
async function loadArocSpeciesIndex(zip: JSZip): Promise<ArocSpeciesIndex> {
    const empty: ArocSpeciesIndex = {byExternId: new Map(), byNombreLower: new Map()};
    const sheetFile = zip.file(SHEET_LISTA_ESPECIES_PATH);
    const ssFile = zip.file(SHEET_SHARED_STRINGS_PATH);
    if (!sheetFile || !ssFile) {
        Logger.getLogger().warn('OfficeReport::loadArocSpeciesIndex: ListaEspecies or sharedStrings missing in template');
        return empty;
    }

    const sheetXml = await sheetFile.async('string');
    const ssXml = await ssFile.async('string');

    // Build the sharedStrings table — keep insertion order, since cells reference by index.
    const sharedStrings: string[] = [];
    const siRe = /<si>([\s\S]*?)<\/si>/g;
    let mSi: RegExpExecArray | null;
    while ((mSi = siRe.exec(ssXml)) !== null) {
        const texts = Array.from(mSi[1].matchAll(/<t[^>]*>([^<]*)<\/t>/g)).map((x) => x[1]);
        sharedStrings.push(texts.join(''));
    }

    // Walk every cell once, decode its value, keep only B/C of rows we care about.
    const cells = new Map<string, string>();
    const cellRe = /<c r="([A-Z]+\d+)"([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g;
    let m: RegExpExecArray | null;
    while ((m = cellRe.exec(sheetXml)) !== null) {
        const ref = m[1];
        const attrs = m[2];
        const inner = m[3] ?? '';
        if (inner === '') continue;

        const isShared = / t="s"/.test(attrs);
        const isInline = / t="inlineStr"/.test(attrs);
        const isStr = / t="str"/.test(attrs);

        const vMatch = inner.match(/<v>([^<]*)<\/v>/);
        const tMatch = inner.match(/<t[^>]*>([^<]*)<\/t>/);

        let value: string | undefined;
        if (isShared && vMatch) {
            value = sharedStrings[parseInt(vMatch[1], 10)];
        } else if (isInline && tMatch) {
            value = tMatch[1];
        } else if ((isStr || !isShared) && vMatch) {
            value = vMatch[1];
        }
        if (value !== undefined) cells.set(ref, value);
    }

    const idx: ArocSpeciesIndex = {byExternId: new Map(), byNombreLower: new Map()};
    for (let row = 3; row <= 48; row++) {
        const nombre = cells.get(`B${row}`);
        const externid = cells.get(`C${row}`);
        if (!nombre || nombre === '') continue;
        idx.byNombreLower.set(nombre.toLowerCase(), nombre);
        if (externid && externid !== '' && externid !== 'sin Taxon ID' && externid !== 'no está en la Lista Patrón') {
            idx.byExternId.set(externid, nombre);
        }
    }
    return idx;
}

/**
 * MEER behavioural-state name → AROC `Actividad` (column AM) label.
 * Returns '' for unknown / unmapped names (e.g. DIVE, MIXED).
 *
 * Values must match the AROC dropdown exactly (lower-case, with the
 * Spanish accents) — see the "Ayuda" sheet of the template.
 */
function mapActivity(name: string): string {
    switch (name.toUpperCase()) {
        case 'TRAVELLING': return 'viajando';
        case 'FAST TRAVEL': return 'viajando rápido';
        case 'SLOW TRAVEL': return 'viajando lento';
        case 'FORAGE/FEEDING':
        case 'FORAGE':
        case 'FEEDING': return 'alimentándose';
        case 'RESTING': return 'descansando';
        case 'MILLING': return 'socializando';
        case 'UNKNOWN': return 'actividad indeterminada';
        default: return '';
    }
}

/**
 * MEER reaction (encounter_categories.name) → AROC `Comportamiento` (column AL).
 * The AROC dropdown only has 3 values: atraídos / indiferentes / esquivos
 * (per the "Ayuda" sheet) — there's no "indeterminado" option in this column.
 * 'Proximity' is intentionally unmapped (Tina/Ricarda 2026-02 thread); 'Unknown'
 * also stays empty since AROC has no equivalent.
 */
function mapReaction(name: string): string {
    switch (name.trim().toLowerCase()) {
        case 'interaction': return 'atraídos';
        case 'no response': return 'indiferentes';
        case 'avoidance': return 'esquivos';
        default: return '';
    }
}

function firstActivityLabel(json: string, behStates: Map<number, BehaviouralStatesDB>): string {
    try {
        const data = JSON.parse(json);
        if (!data) return '';
        for (const value of Object.values(data)) {
            if (typeof value === 'string') {
                const beh = behStates.get(parseInt(value, 10));
                if (beh) {
                    const label = mapActivity(beh.name);
                    if (label !== '') {
                        return label;
                    }
                }
            }
        }
    } catch {
        // ignore — return ''
    }
    return '';
}

type LatLon = {lat: number; lon: number} | null;

function parsePosition(json: string): LatLon {
    try {
        const data = JSON.parse(json);
        if (data && typeof data.latitude === 'number' && typeof data.longitude === 'number') {
            return {lat: data.latitude, lon: data.longitude};
        }
    } catch {
        // fallthrough
    }
    return null;
}

type DMS = {degrees: number; minutes: number; seconds: number};

function dmsParts(decimal: number): DMS {
    const abs = Math.abs(decimal);
    const degrees = Math.floor(abs);
    const minutesFloat = (abs - degrees) * 60;
    const minutes = Math.floor(minutesFloat);
    const seconds = Math.round((minutesFloat - minutes) * 60 * 100) / 100;
    return {degrees, minutes, seconds};
}

type UTM = {easting: number; northing: number; zone: number};

/**
 * Convert WGS84 decimal degrees to UTM (Easting/Northing in metres).
 * Uses the standard Snyder/USGS series formulas — accurate to <1 m within ±3°
 * of the zone's central meridian, which covers all of MEER's operational area
 * (La Gomera ≈ 28°N 17°W → UTM zone 28N).
 *
 * Returns the zone alongside so the caller can apply local conventions; the
 * AROC template wants the X with a negative sign for western offsets — the
 * caller (`buildDataRow`) does that by subtracting the 500 000 m false easting.
 */
function latLonToUtm(latDeg: number, lonDeg: number): UTM {
    const a = 6378137; // WGS84 semi-major axis (m)
    const f = 1 / 298.257223563; // flattening
    const eSq = 2 * f - f * f;
    const ePrSq = eSq / (1 - eSq);
    const k0 = 0.9996;

    const zone = Math.floor((lonDeg + 180) / 6) + 1;
    const lon0Deg = 6 * zone - 183;

    const phi = (latDeg * Math.PI) / 180;
    const lambda = (lonDeg * Math.PI) / 180;
    const lambda0 = (lon0Deg * Math.PI) / 180;

    const sinPhi = Math.sin(phi);
    const cosPhi = Math.cos(phi);
    const tanPhi = Math.tan(phi);

    const N = a / Math.sqrt(1 - eSq * sinPhi * sinPhi);
    const T = tanPhi * tanPhi;
    const C = ePrSq * cosPhi * cosPhi;
    const A = (lambda - lambda0) * cosPhi;

    const M = a * (
        (1 - eSq / 4 - 3 * eSq * eSq / 64 - 5 * eSq * eSq * eSq / 256) * phi
        - (3 * eSq / 8 + 3 * eSq * eSq / 32 + 45 * eSq * eSq * eSq / 1024) * Math.sin(2 * phi)
        + (15 * eSq * eSq / 256 + 45 * eSq * eSq * eSq / 1024) * Math.sin(4 * phi)
        - (35 * eSq * eSq * eSq / 3072) * Math.sin(6 * phi)
    );

    const easting = k0 * N * (
        A
        + (1 - T + C) * Math.pow(A, 3) / 6
        + (5 - 18 * T + T * T + 72 * C - 58 * ePrSq) * Math.pow(A, 5) / 120
    ) + 500000;

    let northing = k0 * (
        M + N * tanPhi * (
            A * A / 2
            + (5 - T + 9 * C + 4 * C * C) * Math.pow(A, 4) / 24
            + (61 - 58 * T + T * T + 600 * C - 330 * ePrSq) * Math.pow(A, 6) / 720
        )
    );
    if (latDeg < 0) {
        northing += 10000000; // southern hemisphere
    }

    return {
        easting: Math.round(easting * 100) / 100,
        northing: Math.round(northing * 100) / 100,
        zone
    };
}

function dateRangeFor(year: number, semester: number | undefined): {from: string; to: string} {
    if (semester === 1) {
        return {from: `${year}-01-01`, to: `${year}-06-30`};
    }
    if (semester === 2) {
        return {from: `${year}-07-01`, to: `${year}-12-31`};
    }
    return {from: `${year}-01-01`, to: `${year}-12-31`};
}

function semesterLabel(semester: number | undefined): string {
    if (semester === 1) return '1er semestre';
    if (semester === 2) return '2do semestre';
    return '';
}

/** Escape a string for safe inclusion as XML text. */
function xmlEscape(s: string): string {
    return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/** Render a `<c>` cell with the existing style attribute (e.g. ` s="19"`) preserved. */
function renderCell(ref: string, value: string | number, styleAttr: string): string {
    if (typeof value === 'number') {
        return `<c r="${ref}"${styleAttr}><v>${value}</v></c>`;
    }
    return `<c r="${ref}"${styleAttr} t="inlineStr"><is><t xml:space="preserve">${xmlEscape(value)}</t></is></c>`;
}

/** Convert a column letter (e.g. "AO") to its 1-based index, for sorting cells inside a row. */
function colIndex(ref: string): number {
    const m = ref.match(/^([A-Z]+)/);
    if (!m) return 0;
    let n = 0;
    for (const ch of m[1]) {
        n = n * 26 + (ch.charCodeAt(0) - 64);
    }
    return n;
}

/**
 * Strip shared-formula entries from given columns across the whole sheet.
 *
 * The AROC template carries shared-formula chains (`<f t="shared" ref="X2:X66" si="N">…</f>`
 * with reference cells `<f t="shared" si="N"/>` in subsequent rows). When we
 * overwrite a master cell with a literal value, every reference cell that
 * pointed at that si becomes invalid XML and Excel raises the repair dialog.
 *
 * For the columns where we plan to write our own values (S/T/AA/AE/AI/AK) we
 * drop the formula entirely — the cell becomes empty-styled. Our patcher then
 * fills these with explicit values in the data rows; the remaining rows just
 * stay blank, which is the same visual result the template intended for rows
 * without a `Nombre común` in column N.
 */
function stripSharedFormulas(xml: string, columns: string[]): string {
    const colPattern = columns.join('|');
    const re = new RegExp(
        `<c r="((?:${colPattern})\\d+)"([^>]*?)>(?:<f[^>]*>[^<]*</f>|<f[^/]*/>)(?:<v[^/]*/>|<v>[^<]*</v>)</c>`,
        'g'
    );
    return xml.replace(re, (_full, ref, attrs) => {
        // The cell is no longer a formula string: drop t="str".
        const cleaned = String(attrs).replace(/\s+t="str"/, '');
        return `<c r="${ref}"${cleaned}/>`;
    });
}

/**
 * Replace a single cell's value in `datos GENERALES`-style sheet XML where
 * the cell already exists as `<c r="REF"…/>`. Strings go in as inline-string,
 * numbers as bare `<v>`. Missing cells are silently skipped — the user can
 * still fill them by hand. We're conservative on purpose: only the *value*
 * inside the existing `<c>` element changes, the style `s="…"` is preserved.
 */
function patchGeneralCell(xml: string, ref: string, value: string | number): string {
    if (value === '' || value === undefined) {
        return xml;
    }

    // Match an existing <c r="REF" ...>...</c> or self-closing <c r="REF" .../>
    const cellRe = new RegExp(
        `<c r="${ref}"([^/>]*)(/>|>(.*?)</c>)`,
        's'
    );

    const replacementInner = typeof value === 'number'
        ? `<v>${value}</v>`
        : `<is><t xml:space="preserve">${xmlEscape(String(value))}</t></is>`;
    const tAttr = typeof value === 'number' ? '' : ' t="inlineStr"';

    if (cellRe.test(xml)) {
        return xml.replace(cellRe, (_match, attrs) => {
            // Strip any existing t="…" attribute from `attrs` so we don't double up.
            const cleanAttrs = String(attrs).replace(/\s+t="[^"]*"/, '');
            return `<c r="${ref}"${cleanAttrs}${tAttr}>${replacementInner}</c>`;
        });
    }

    // Cell doesn't exist yet — append it before </sheetData>. We can't know the
    // right row index for it; for the GENERAL sheet that's never the case in
    // practice (every reachable cell exists in the template). Bail quietly.
    return xml;
}

/**
 * Patch input-side cells into an existing template row, preserving every
 * formula-bearing cell we don't touch (A/B/C/D/E/F/G/H/I/O/P keep their
 * `<f>…</f>` so AROC's auto-derived columns still compute from N and
 * `datos GENERALES`).
 *
 * For each column in `data` we either:
 *   - replace the existing cell at that ref with a new value cell, keeping
 *     its `s="…"` style attribute, or
 *   - append a new value cell at the right column position when the template
 *     row doesn't have one (rows 2-3 e.g. have no J/K/L/M skeleton).
 *
 * Style: we re-use the template's existing `s="…"` when available, otherwise
 * we leave the style off so Excel falls back to the column default in
 * `<cols>` (every column in `datos SALIDAS` has a default style set).
 */
function patchSightingRow(rowXml: string, rowNum: number, data: Record<string, string | number>): string {
    const openMatch = rowXml.match(/^<row[^>]*>/);
    if (!openMatch) {
        return rowXml;
    }
    const openTag = openMatch[0];
    const inner = rowXml.slice(openTag.length, -'</row>'.length);

    // Parse existing cells into ref -> raw + ref -> style attribute.
    const cells = new Map<string, string>();
    const styles = new Map<string, string>();

    const cellRe = /<c r="([A-Z]+\d+)"([^>]*?)(?:\/>|>(?:[^<]|<(?!\/c>))*<\/c>)/g;
    let m: RegExpExecArray | null;
    while ((m = cellRe.exec(inner)) !== null) {
        cells.set(m[1], m[0]);
        const styleMatch = m[2].match(/\s+s="\d+"/);
        styles.set(m[1], styleMatch ? styleMatch[0] : '');
    }

    // Apply our patches, overwriting / inserting cells while preserving styles.
    for (const [col, val] of Object.entries(data)) {
        if (val === '' || (typeof val === 'number' && !Number.isFinite(val))) {
            continue;
        }
        const ref = `${col}${rowNum}`;
        const styleAttr = styles.get(ref) ?? '';
        cells.set(ref, renderCell(ref, val, styleAttr));
        styles.set(ref, styleAttr);
    }

    const sorted = Array.from(cells.entries()).sort(
        (a, b) => colIndex(a[0]) - colIndex(b[0])
    );

    return openTag + sorted.map(([, raw]) => raw).join('') + '</row>';
}

/**
 * CreateExport
 *
 * The AROC template (`datos SALIDAS` sheet) ships with 10 000 pre-formatted
 * rows full of derived-column formulas. exceljs chokes on it — so we open the
 * .xlsx directly via JSZip and patch the raw XML.
 *
 * Strategy: patch only the input-side cells (J/K/L/M/N/Q/R/S/T/U/V/W/X/Y/Z/
 * AA/AB/AC/AD/AE/AF/AH/AI?/AJ/AK?/AL/AM/AN/AO) into the existing data rows
 * so AROC's auto-derived columns (A/B/C/D/E/F/G/H/I/O/P) keep their formulas
 * and recompute from N + `datos GENERALES`. Before patching we drop the
 * shared-formula chains in columns we overwrite (S/T/AA/AE/AI/AK) so the
 * master/reference relationship doesn't break, and we drop `calcChain.xml`
 * so Excel rebuilds the calc-cache on first save — without it, orphan
 * references trigger the "We found a problem with some content" repair
 * dialog and Office discards data validations in the process.
 */
export class CreateExport {

    /**
     * Build an AROC office-report XLSX. Returns null when template/dir is missing
     * (route layer turns that into 500). Caller should pass `vehicle_id` + `year`
     * + `semester` since AROC requires one file per boat per half-year — without
     * `vehicle_id` `datos GENERALES` stays mostly blank.
     */
    public static async createExport(filter?: OfficeReportFilter): Promise<Buffer | null> {
        Logger.getLogger().info('OfficeReport::createExport: start!');

        const reportDir = await UtilUploadPath.getOfficeReportDirectory();
        if (reportDir === null) {
            Logger.getLogger().error('OfficeReport::createExport: assets dir can not create/found!');
            return null;
        }

        const templatePath = Path.join(reportDir, TEMPLATE_FILENAME);
        if (!fs.existsSync(templatePath)) {
            Logger.getLogger().error(`OfficeReport::createExport: template missing: ${templatePath}`);
            return null;
        }

        const externalReceiverId = filter?.external_receiver_id && filter.external_receiver_id > 0
            ? filter.external_receiver_id
            : 1;

        const vehicleId = filter?.vehicle_id && filter.vehicle_id > 0 ? filter.vehicle_id : 0;
        const organizationId = filter?.organization_id && filter.organization_id > 0
            ? filter.organization_id
            : 0;
        const year = filter?.year && Number.isFinite(filter.year) && filter.year > 0
            ? filter.year
            : 0;
        const semester = filter?.semester === 1 || filter?.semester === 2
            ? filter.semester
            : undefined;

        // --- Lookup tables ---------------------------------------------------------------
        const behStates = new Map<number, BehaviouralStatesDB>();
        for (const beh of await BehaviouralStatesRepository.getInstance().findAll()) {
            behStates.set(beh.id, beh);
        }

        const enCats = new Map<number, EncounterCategoriesDB>();
        for (const cat of await EncounterCategoriesRepository.getInstance().findAll()) {
            enCats.set(cat.id, cat);
        }

        const userNames = new Map<number, string>();
        for (const u of await UserRepository.getInstance().findAll()) {
            userNames.set(u.id, u.full_name);
        }

        let vehicle: VehicleDB | null = null;
        let organization: OrganizationDB | null = null;
        if (vehicleId > 0) {
            vehicle = await VehicleRepository.getInstance().findOne(vehicleId);
            if (vehicle) {
                organization = await OrganizationRepository.getInstance().findOne(vehicle.organization_id);
            }
        }

        // Explicit organization filter wins for the GENERALES sheet when the
        // caller didn't pin a vehicle — otherwise we'd leak the wrong org's
        // header data into a "all boats of org X" report.
        if (!organization && organizationId > 0) {
            organization = await OrganizationRepository.getInstance().findOne(organizationId);
        }

        // --- Sightings query -------------------------------------------------------------
        const sightingRepo = await SightingRepository.getInstance().getRepository();
        const baseWhere: FindOptionsWhere<SightingDB> = {deleted: false};

        if (vehicleId > 0) {
            baseWhere.vehicle_id = vehicleId;
        } else if (organizationId > 0) {
            // Resolve org → vehicles. `sighting.organization_id` is only filled
            // by the mobile-save path, so legacy / main-web rows hold 0 and a
            // direct `s.organization_id = :org` filter never matches anything.
            // The vehicle's own org column is authoritative.
            const vehicleRepoForOrg = await VehicleRepository.getInstance().getRepository();
            const orgVehicles = await vehicleRepoForOrg.find({where: {organization_id: organizationId}});
            const orgVehicleIds = orgVehicles.map((v) => v.id);

            if (orgVehicleIds.length === 0) {
                Logger.getLogger().info(
                    `OfficeReport::createExport: no vehicles found for organization_id=${organizationId}`
                );
                return null;
            }

            baseWhere.vehicle_id = In(orgVehicleIds);
        }

        if (year > 0) {
            const range = dateRangeFor(year, semester);
            baseWhere.date = Between(range.from, range.to);
        } else if (semester !== undefined) {
            const months = semester === 1 ? '(1,2,3,4,5,6)' : '(7,8,9,10,11,12)';
            baseWhere.date = Raw((alias) => `MONTH(${alias}) IN ${months}`);
        }

        const sightings = await sightingRepo.find({
            where: baseWhere,
            order: {date: 'ASC', tour_start: 'ASC'}
        });

        // --- Open template via JSZip -----------------------------------------------------
        const buf = fs.readFileSync(templatePath);
        const zip = await JSZip.loadAsync(buf);

        const dataSheetFile = zip.file(SHEET_DATA_PATH);
        const generalSheetFile = zip.file(SHEET_GENERAL_PATH);
        if (!dataSheetFile || !generalSheetFile) {
            Logger.getLogger().error('OfficeReport::createExport: required sheets missing in template');
            return null;
        }

        let dataXml = await dataSheetFile.async('string');
        let generalXml = await generalSheetFile.async('string');

        const arocSpeciesIndex = await loadArocSpeciesIndex(zip);

        // --- Fill `datos GENERALES` ------------------------------------------------------
        if (organization) {
            generalXml = patchGeneralCell(generalXml, 'B5', organization.aroc_region);
            generalXml = patchGeneralCell(generalXml, 'C5', organization.aroc_number);
            generalXml = patchGeneralCell(generalXml, 'B6', organization.description);
            if (organization.aroc_authorized_boats > 0) {
                generalXml = patchGeneralCell(generalXml, 'B8', organization.aroc_authorized_boats);
            }
            generalXml = patchGeneralCell(generalXml, 'B10', organization.province);
            generalXml = patchGeneralCell(generalXml, 'C10', organization.island);
            generalXml = patchGeneralCell(generalXml, 'D10', organization.port);
            generalXml = patchGeneralCell(generalXml, 'B25', organization.email);
            generalXml = patchGeneralCell(generalXml, 'B26', organization.web);
        }
        if (vehicle) {
            generalXml = patchGeneralCell(generalXml, 'B7', vehicle.description);
        }
        if (year > 0) {
            // Export-year drives both AROC authorization year (D5, "Jahr de la
            // autorización") and the report header field B14 ("Año del informe").
            generalXml = patchGeneralCell(generalXml, 'D5', year);
            generalXml = patchGeneralCell(generalXml, 'B14', year);
        }
        const semLabel = semesterLabel(semester);
        if (semLabel !== '') {
            generalXml = patchGeneralCell(generalXml, 'C14', semLabel);
        }
        generalXml = patchGeneralCell(generalXml, 'B15', 'WGS84');

        // --- Build per-row patch sets ----------------------------------------------------
        // Per AROC "Ayuda" sheet:
        //   N (Nombre común) is the dropdown — `species_extern_link.externname` for the
        //     selected receiver must therefore contain the Spanish common name (NOT
        //     the scientific name). The receiver mapping is admin-configured.
        //   P (Nombre científico) is auto-filled by template formula from N — we leave
        //     it alone.
        //   A/B/C/D/E/F/G/H/I/O are also auto-derived from N + `datos GENERALES` and
        //     stay untouched so the template keeps recomputing them.
        //   Q (Observador) wants the individual observer's full name, not the org.
        //   J (Fecha) wants DD/MM/YYYY.
        //   AH/AJ values are uppercase SI/NO (no INDET in our model — we always know).
        //   AL/AM values are lowercase per dropdown (atraídos / viajando / …).
        //   AN (Número de barcos máximo) is integer; our `other_vehicle` column is free
        //     text, so try to parse a leading number out of it.
        const dataByRow = new Map<number, Record<string, string | number>>();
        let rowNum = FIRST_DATA_ROW;

        for (const entry of sightings) {
            if (entry.species_id === 0) {
                continue;
            }

            const date = moment(entry.date);

            const speciesExternLink = await SpeciesExternLinkRepository.getInstance().findByReceiverAndSpecies(
                externalReceiverId,
                entry.species_id
            );

            // N (Nombre común) must match the AROC ListaEspecies dropdown exactly,
            // otherwise the VLOOKUP in column P returns blank and AROC marks the
            // row as a data-entry error. Source of truth = the template's own
            // ListaEspecies sheet; we join primarily via `externid` (AROC Taxon-ID
            // in ListaEspecies!C) and fall back to a case-insensitive name match
            // for legacy `externname` rows where the externid was never set.
            let nombreComun = '';
            if (!speciesExternLink) {
                Logger.getLogger().info(
                    `OfficeReport::createExport: extern link not found by species ID: ${entry.species_id}`
                );
            } else {
                const byId = arocSpeciesIndex.byExternId.get(speciesExternLink.externid);
                if (byId) {
                    nombreComun = byId;
                } else {
                    const byName = arocSpeciesIndex.byNombreLower.get(
                        speciesExternLink.externname.toLowerCase()
                    );
                    if (byName) {
                        nombreComun = byName;
                    } else {
                        Logger.getLogger().warn(
                            'OfficeReport::createExport: species_extern_link '
                            + `(receiver=${externalReceiverId}, species_id=${entry.species_id}, `
                            + `externid="${speciesExternLink.externid}", `
                            + `externname="${speciesExternLink.externname}") `
                            + 'does not resolve to any AROC ListaEspecies entry — leaving N blank'
                        );
                    }
                }
            }

            const observer = userNames.get(entry.creater_id) ?? '';

            const presenciaCrias = entry.calves > 0 ? 'SI' : 'NO';
            const presenciaNeonatos = entry.newborns > 0 ? 'SI' : 'NO';

            const activity = firstActivityLabel(entry.behaviours, behStates);
            const reactionCat = enCats.get(entry.reaction_id);
            const reaction = reactionCat ? mapReaction(reactionCat.name) : '';

            const pos = parsePosition(entry.location_begin);
            const lonDms = pos ? dmsParts(pos.lon) : null;
            const latDms = pos ? dmsParts(pos.lat) : null;
            const utm = pos ? latLonToUtm(pos.lat, pos.lon) : null;

            const otherBoatsMatch = entry.other_vehicle.match(/-?\d+/);
            const otherBoatsNum = otherBoatsMatch ? parseInt(otherBoatsMatch[0], 10) : NaN;

            const cells: Record<string, string | number> = {
                J: date.isValid() ? date.format('DD/MM/YYYY') : entry.date,
                K: entry.tour_start,
                L: entry.tour_end,
                M: entry.duration_from,
                N: nombreComun,
                Q: observer,
                R: 'WGS84'
            };

            if (pos && lonDms && latDms && utm) {
                // U / V = UTM Easting/Northing (metres). AROC convention (Ayuda D9):
                // X gets a negative sign for western offsets, so we subtract the
                // 500 000 m false easting. Y stays as standard UTM Northing.
                const utmX = Math.round((utm.easting - 500000) * 100) / 100;
                cells.U = utmX;
                cells.V = utm.northing;

                // S / T = "Coordenada X/Y DEFINITIVA" — the template formula is
                // IF(U="",AA,U) / IF(V="",AE,V). We mirror UTM here so the value is
                // consistent across the report even though we strip the shared
                // formula (see stripSharedFormulas call below).
                cells.S = utmX;
                cells.T = utm.northing;

                cells.W = pos.lon < 0 ? 'O' : 'E';
                cells.X = lonDms.degrees;
                cells.Y = lonDms.minutes;
                cells.Z = lonDms.seconds;
                cells.AA = pos.lon;
                cells.AB = latDms.degrees;
                cells.AC = latDms.minutes;
                cells.AD = latDms.seconds;
                cells.AE = pos.lat;
            }

            if (entry.species_count > 0) {
                cells.AF = entry.species_count;
            }
            cells.AH = presenciaCrias;
            if (entry.calves > 0) {
                cells.AI = entry.calves;
            }
            cells.AJ = presenciaNeonatos;
            if (entry.newborns > 0) {
                cells.AK = entry.newborns;
            }
            cells.AL = reaction;
            cells.AM = activity;
            if (Number.isFinite(otherBoatsNum) && otherBoatsNum >= 0) {
                cells.AN = otherBoatsNum;
            }
            cells.AO = entry.note;

            dataByRow.set(rowNum, cells);
            rowNum++;

            if (rowNum > 10000) {
                Logger.getLogger().warn(
                    'OfficeReport::createExport: more than 9999 sightings — template can\'t hold them, truncating'
                );
                break;
            }
        }

        // Strip shared-formula chains in the columns whose master cells we'll
        // overwrite. Without this, replacing AI2/AK2/S4/T4/AA4/AE4 (the shared
        // masters) leaves the `<f t="shared" si="N"/>` references in later rows
        // dangling, which Office reports as "unreadable content".
        dataXml = stripSharedFormulas(dataXml, ['S', 'T', 'AA', 'AE', 'AI', 'AK']);

        // Walk the existing `<row>` elements and patch the rows we have data for.
        // Everything else (header, untouched data rows further down) stays as is,
        // including A/B/C/D/E/F/G/H/I/O/P formulas that auto-fill from our N.
        const patched: string[] = [];
        let cursor = 0;
        while (cursor < dataXml.length) {
            const rowStart = dataXml.indexOf('<row r="', cursor);
            if (rowStart < 0) {
                break;
            }
            const rowCloseIdx = dataXml.indexOf('</row>', rowStart);
            if (rowCloseIdx < 0) {
                break;
            }
            const rowEnd = rowCloseIdx + '</row>'.length;
            patched.push(dataXml.slice(cursor, rowStart));

            const fullRow = dataXml.slice(rowStart, rowEnd);
            const rowNumMatch = fullRow.match(/^<row r="(\d+)"/);
            const thisRowNum = rowNumMatch ? parseInt(rowNumMatch[1], 10) : -1;
            const data = dataByRow.get(thisRowNum);
            patched.push(data ? patchSightingRow(fullRow, thisRowNum, data) : fullRow);

            cursor = rowEnd;
        }
        patched.push(dataXml.slice(cursor));
        dataXml = patched.join('');

        zip.file(SHEET_DATA_PATH, dataXml);
        zip.file(SHEET_GENERAL_PATH, generalXml);

        // Drop calcChain.xml plus its rel + content-type override. The template's
        // cached formula evaluation order now references cells we either
        // overwrote with literals or stripped formulas from; leaving it in place
        // is what triggers Excel's "We found a problem with some content"
        // repair dialog (and the side effect of Office throwing away data
        // validations during repair). calcChain is purely a runtime cache —
        // Excel rebuilds it on the first save.
        zip.remove('xl/calcChain.xml');
        const wbRelsPath = 'xl/_rels/workbook.xml.rels';
        const wbRels = zip.file(wbRelsPath);
        if (wbRels) {
            const xml = (await wbRels.async('string'))
            .replace(/<Relationship[^>]*Target="calcChain\.xml"[^>]*\/>/, '');
            zip.file(wbRelsPath, xml);
        }
        const ctPath = '[Content_Types].xml';
        const ct = zip.file(ctPath);
        if (ct) {
            const xml = (await ct.async('string'))
            .replace(/<Override[^>]*PartName="\/xl\/calcChain\.xml"[^>]*\/>/, '');
            zip.file(ctPath, xml);
        }

        // Force MS Office to fully recompute formulas on first open. Without
        // `fullCalcOnLoad="1"` Excel trusts the cached `<v/>` values that ship
        // in the template (which are empty because the template's row 2…10001
        // had no input data baked in), and column P (Nombre científico VLOOKUP
        // on our patched N) stays blank until the user manually presses F9.
        // LibreOffice always recalculates on load, which is why it shows the
        // expected values without this flag.
        const wbPath = 'xl/workbook.xml';
        const wb = zip.file(wbPath);
        if (wb) {
            let xml = await wb.async('string');
            if (/<calcPr[^/]*\/>/.test(xml)) {
                xml = xml.replace(/<calcPr([^/]*)\/>/, (match, attrs) => {
                    if (/\bfullCalcOnLoad=/.test(attrs)) {
                        return match.replace(/fullCalcOnLoad="[^"]*"/, 'fullCalcOnLoad="1"');
                    }
                    return `<calcPr${attrs} fullCalcOnLoad="1"/>`;
                });
            } else {
                // No <calcPr/> at all — inject one just before </workbook>.
                xml = xml.replace('</workbook>', '<calcPr fullCalcOnLoad="1"/></workbook>');
            }
            zip.file(wbPath, xml);
        }

        try {
            const out = await zip.generateAsync({
                type: 'nodebuffer',
                compression: 'DEFLATE',
                compressionOptions: {level: 6}
            });
            return out;
        } catch (e) {
            Logger.getLogger().error('OfficeReport::createExport: zip.generateAsync failed', e as Error);
            return null;
        }
    }

}