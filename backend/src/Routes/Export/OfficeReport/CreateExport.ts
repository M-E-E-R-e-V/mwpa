import fs from 'fs';
import JSZip from 'jszip';
import moment from 'moment';
import Path from 'path';
import {Logger} from 'figtree';
import {OfficeReportFilter} from 'mwpa_schemas';
import {Between, FindOptionsWhere, Raw} from 'typeorm';
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
const FIRST_DATA_ROW = 2;

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

/** Build a `<c>` cell element with an inline string value. */
function cellStr(ref: string, value: string): string {
    if (value === '') {
        return '';
    }
    return `<c r="${ref}" t="inlineStr"><is><t xml:space="preserve">${xmlEscape(value)}</t></is></c>`;
}

/** Build a `<c>` cell element with a numeric value. */
function cellNum(ref: string, value: number): string {
    return `<c r="${ref}"><v>${value}</v></c>`;
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
 * Build one full `<row>` XML element for a sighting row in `datos SALIDAS`.
 * Cells are emitted only for the columns we have data for — empty columns
 * fall back to the workbook's column-default styles (set in `<cols>`).
 */
function buildDataRow(rowNum: number, cells: Record<string, string | number>): string {
    const parts: string[] = [];
    for (const [col, val] of Object.entries(cells)) {
        const ref = `${col}${rowNum}`;
        if (typeof val === 'number') {
            if (Number.isFinite(val)) {
                parts.push(cellNum(ref, val));
            }
        } else if (val !== '') {
            parts.push(cellStr(ref, val));
        }
    }
    return `<row r="${rowNum}" spans="1:41">${parts.join('')}</row>`;
}

/**
 * CreateExport
 *
 * The new AROC template (`datos SALIDAS` sheet) ships with 10 000 pre-formatted
 * rows full of derived-column formulas. exceljs chokes on it — so we open the
 * .xlsx directly via JSZip and patch the raw XML. Cleaner, faster, and we
 * preserve whatever the template provides on rows we don't touch.
 *
 * The pre-shrunk template kept under `data/office_report/` already has its
 * sheet3 sheetData reduced to just the header row (see the build-time shrink
 * applied 2026-05-10) so re-emitting our data rows here is enough.
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
        }

        if (organizationId > 0) {
            baseWhere.organization_id = organizationId;
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

        // --- Fill `datos GENERALES` ------------------------------------------------------
        if (organization) {
            generalXml = patchGeneralCell(generalXml, 'B5', organization.aroc_region);
            generalXml = patchGeneralCell(generalXml, 'C5', organization.aroc_number);
            if (organization.aroc_year > 0) {
                generalXml = patchGeneralCell(generalXml, 'D5', organization.aroc_year);
            }
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
            generalXml = patchGeneralCell(generalXml, 'B14', year);
        }
        const semLabel = semesterLabel(semester);
        if (semLabel !== '') {
            generalXml = patchGeneralCell(generalXml, 'C14', semLabel);
        }
        generalXml = patchGeneralCell(generalXml, 'B15', 'WGS84');

        // --- Build `datos SALIDAS` rows --------------------------------------------------
        // Per AROC "Ayuda" sheet:
        //   N (Nombre común) is the dropdown — `species_extern_link.externname` for the
        //     selected receiver must therefore contain the Spanish common name (NOT
        //     the scientific name). The receiver mapping is admin-configured.
        //   P (Nombre científico) is auto-filled by template formula from N.
        //   Q (Observador) wants the individual observer's full name, not the org.
        //   J (Fecha) wants DD/MM/YYYY.
        //   AH/AJ values are uppercase SI/NO (no INDET in our model — we always know).
        //   AL/AM values are lowercase per dropdown (atraídos / viajando / …).
        //   AN (Número de barcos máximo) is integer; our `other_vehicle` column is free
        //     text, so try to parse a leading number out of it.
        const dataRows: string[] = [];
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

            const nombreComun = speciesExternLink ? speciesExternLink.externname : '';
            if (!speciesExternLink) {
                Logger.getLogger().info(
                    `OfficeReport::createExport: extern link not found by species ID: ${entry.species_id}`
                );
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
                // S / T = "Coordenada X/Y DEFINITIVA". Template has no formula here —
                // we put the WGS84 decimal pair (X = longitude, Y = latitude) so the
                // AROC office sees a single canonical position without copy-pasting.
                cells.S = pos.lon;
                cells.T = pos.lat;

                // U / V = UTM Easting/Northing (metres). AROC convention (Ayuda D9):
                // X gets a negative sign for western offsets, so we subtract the
                // 500 000 m false easting. Y stays as standard UTM Northing.
                cells.U = Math.round((utm.easting - 500000) * 100) / 100;
                cells.V = utm.northing;

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

            dataRows.push(buildDataRow(rowNum, cells));
            rowNum++;
        }

        // Replace `<sheetData>` content. The pre-shrunk template keeps row 1 (header)
        // intact — preserve it and append our data rows after it.
        const headerMatch = dataXml.match(/<sheetData>(\s*<row r="1"[^>]*>.*?<\/row>)/s);
        if (headerMatch) {
            const headerRow = headerMatch[1];
            dataXml = dataXml.replace(
                /<sheetData>.*?<\/sheetData>/s,
                `<sheetData>${headerRow}${dataRows.join('')}</sheetData>`
            );
        } else {
            dataXml = dataXml.replace(
                /<sheetData>.*?<\/sheetData>/s,
                `<sheetData>${dataRows.join('')}</sheetData>`
            );
        }

        // Update the dimension attribute so Excel knows the used range.
        const lastRow = Math.max(rowNum - 1, 1);
        dataXml = dataXml.replace(
            /dimension ref="[^"]*"/,
            `dimension ref="A1:AO${lastRow}"`
        );

        zip.file(SHEET_DATA_PATH, dataXml);
        zip.file(SHEET_GENERAL_PATH, generalXml);

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