import moment from 'moment';
import xlsx, {WorkSheet} from 'node-xlsx';
import {Sighting, SightingType} from '../../../Db/MariaDb/Entities/Sighting.js';
import {SightingExtended} from '../../../Db/MariaDb/Entities/SightingExtended.js';
import {BehaviouralStatesRepository} from '../../../Db/MariaDb/Repositories/BehaviouralStatesRepository.js';
import {EncounterCategoriesRepository} from '../../../Db/MariaDb/Repositories/EncounterCategoriesRepository.js';
import {OrganizationRepository} from '../../../Db/MariaDb/Repositories/OrganizationRepository.js';
import {SightingExtendedRepository} from '../../../Db/MariaDb/Repositories/SightingExtendedRepository.js';
import {SightingRepository, SightingFilterCriteria} from '../../../Db/MariaDb/Repositories/SightingRepository.js';
import {SpeciesRepository} from '../../../Db/MariaDb/Repositories/SpeciesRepository.js';
import {UserRepository} from '../../../Db/MariaDb/Repositories/UserRepository.js';
import {VehicleDriverRepository} from '../../../Db/MariaDb/Repositories/VehicleDriverRepository.js';
import {VehicleRepository} from '../../../Db/MariaDb/Repositories/VehicleRepository.js';
import {UtilDistanceCoast} from '../../../Utils/UtilDistanceCoast.js';
import {UtilPosition, UtilPositionToStr} from '../../../Utils/UtilPosition.js';
import {UtilSelect} from '../../../Utils/UtilSelect.js';

/**
 * Coordinate-format selector for the position columns. Mirrors the picker
 * the frontend ships in `SightingExport`. `all` emits every format
 * side-by-side (decimal + DMS + DM) for each lat/lon axis.
 */
export type ExcelCoordFormat = 'decimal' | 'dms' | 'dm' | 'all';

const VALID_COORD_FORMATS: ExcelCoordFormat[] = ['decimal', 'dms', 'dm', 'all'];

/**
 * Options forwarded from the route handler. All fields are optional so
 * `Excel.build()` with no args still produces the legacy column set over
 * every non-deleted sighting.
 */
export type ExcelBuildOptions = {
    columns?: string[];
    coordFormat?: ExcelCoordFormat;
    /**
     * Same shape as the list endpoint's filter. Empty / undefined fields
     * are ignored; passing `{}` is equivalent to no filter at all.
     */
    filter?: SightingFilterCriteria;
};

/**
 * Standard column ids — kept in lock-step with `STANDARD_COLUMNS` in
 * `frontend/src/inc/Widget/SightingExport.ts`. The order here defines the
 * column order in the output sheet; the position-column block is inserted
 * between `duration_until` and `distance_estimation` (same place the
 * legacy export had it).
 */
const STANDARD_KEYS_ORDERED: string[] = [
    'id',
    'date',
    'tour_start',
    'tour_end',
    'boat',
    'skipper',
    'observer',
    'beaufort',
    'species',
    'animal_count',
    'duration_from',
    'duration_until',
    // <position columns inserted here>
    'distance_estimation',
    'distance_coast',
    'juveniles',
    'calves',
    'newborns',
    'behaviour',
    'group_structure',
    'subgroups',
    'reaction',
    'freq_behaviour',
    'photo_taken',
    'recognizable_animals',
    'other_species',
    'other',
    'other_vehicle',
    'note'
];

const STANDARD_LABELS: Record<string, string> = {
    id: 'Id',
    date: 'Date',
    tour_start: 'Start of trip',
    tour_end: 'End of trip',
    boat: 'Boat',
    skipper: 'Skipper',
    observer: 'Observer',
    beaufort: 'Wind/Seastate (Beaufort)',
    species: 'Species',
    animal_count: 'Number of animals',
    duration_from: 'Duration from',
    duration_until: 'Duration until',
    distance_estimation: 'Estimation without GPS',
    distance_coast: 'Distance to nearst coast (nm)',
    juveniles: 'Juveniles',
    calves: 'Calves',
    newborns: 'Newborns',
    behaviour: 'Behaviour',
    group_structure: 'Group structure',
    subgroups: 'Subgroups',
    reaction: 'Reaction',
    freq_behaviour: 'Frequent behaviours of individuals',
    photo_taken: 'Photos taken',
    recognizable_animals: 'Recognizable animals',
    other_species: 'Other species',
    other: 'Other',
    other_vehicle: 'Other boats present',
    note: 'Note'
};

/**
 * Optional column ids — kept in sync with the OPTIONAL_GROUPS in the
 * frontend widget. The output order is the order defined here.
 */
const OPTIONAL_KEYS_ORDERED: string[] = [
    'unid',
    'sighting_type',
    'organization',
    'create_datetime',
    'update_datetime',
    'tour_fid',
    'depth_m',
    'depth_provider',
    'sst_c_day',
    'air_temperature_c_day',
    'uv_index_day',
    'wave_height_m_day',
    'wave_period_s_day',
    'wave_direction_deg_day',
    'sst_c_hour',
    'air_temperature_c_hour',
    'uv_index_hour',
    'wave_height_m_hour',
    'wave_period_s_hour',
    'wave_direction_deg_hour'
];

const OPTIONAL_LABELS: Record<string, string> = {
    unid: 'UUID',
    sighting_type: 'Sighting type',
    organization: 'Organization',
    create_datetime: 'Created at',
    update_datetime: 'Updated at',
    tour_fid: 'Tour FID',
    depth_m: 'Sea depth (m)',
    depth_provider: 'Depth provider',
    sst_c_day: 'Sea-surface temperature (Day mean, °C)',
    air_temperature_c_day: 'Air temperature (Day mean, °C)',
    uv_index_day: 'UV index (Day max)',
    wave_height_m_day: 'Wave height (Day mean, m)',
    wave_period_s_day: 'Wave period (Day mean, s)',
    wave_direction_deg_day: 'Wave direction (Day mean, °)',
    sst_c_hour: 'Sea-surface temperature (At hour, °C)',
    air_temperature_c_hour: 'Air temperature (At hour, °C)',
    uv_index_hour: 'UV index (At hour)',
    wave_height_m_hour: 'Wave height (At hour, m)',
    wave_period_s_hour: 'Wave period (At hour, s)',
    wave_direction_deg_hour: 'Wave direction (At hour, °)'
};

/** Optional keys that pull data out of `sighting_extended`. */
const EXTENDED_KEYS = new Set<string>([
    'depth_m',
    'depth_provider',
    'sst_c_day',
    'air_temperature_c_day',
    'uv_index_day',
    'wave_height_m_day',
    'wave_period_s_day',
    'wave_direction_deg_day',
    'sst_c_hour',
    'air_temperature_c_hour',
    'uv_index_hour',
    'wave_height_m_hour',
    'wave_period_s_hour',
    'wave_direction_deg_hour'
]);

const GROUP_STRUCTURE: Record<number, string> = {
    1: 'widely dispersed',
    2: 'dispersed',
    3: 'loose',
    4: 'tight'
};

const SIGHTING_TYPE_LABELS: Record<number, string> = {
    [SightingType.NORMAL]: 'NORMAL',
    [SightingType.SHORT]: 'SHORT',
    [SightingType.NOTICE]: 'NOTICE',
    [SightingType.FREE]: 'FREE'
};

/**
 * Parse the JSON-encoded behaviours blob ({k: speciesId-as-string}) into a comma-joined
 * list of behavioural-state names. Mirrors legacy behaviour: silently returns '' on parse error.
 */
const buildBehaviourStr = (raw: string, behStates: Map<number, string>): string => {
    try {
        const data = JSON.parse(raw) as Record<string, unknown> | null;
        if (!data) {
            return '';
        }
        const names: string[] = [];
        for (const value of Object.values(data)) {
            if (typeof value === 'string') {
                const name = behStates.get(parseInt(value, 10));
                if (name) {
                    names.push(name);
                }
            }
        }
        return names.join(', ');
    } catch {
        return '';
    }
};

const buildFreqStr = (raw: string): string => {
    try {
        const data = JSON.parse(raw) as Record<string, unknown> | null;
        if (!data) {
            return '';
        }
        const items: string[] = [];
        for (const value of Object.values(data)) {
            if (typeof value === 'string') {
                items.push(value);
            }
        }
        return items.join(', ');
    } catch {
        return '';
    }
};

const buildOtherSpeciesStr = (raw: string, species: Map<number, string>): string => {
    try {
        const data = JSON.parse(raw) as Record<string, unknown> | null;
        if (!data) {
            return '';
        }
        const names: string[] = [];
        for (const value of Object.values(data)) {
            if (typeof value === 'string') {
                const name = species.get(parseInt(value, 10));
                if (name) {
                    names.push(name);
                }
            }
        }
        return names.join(', ');
    } catch {
        return '';
    }
};

/** Render a unix-seconds timestamp as `YYYY-MM-DD HH:mm:ss`, or '' for 0. */
const formatTimestamp = (seconds: number): string => {
    if (!seconds) {
        return '';
    }
    return moment(seconds * 1000).format('YYYY-MM-DD HH:mm:ss');
};

/** Render any nullable numeric column from `sighting_extended` as a string ('' on null). */
const formatNumeric = (value: number | string | null | undefined): string => {
    if (value === null || value === undefined) {
        return '';
    }
    return `${value}`;
};

/**
 * Build the position-column header + per-row emitter pair for the chosen
 * coord format. Always returns four logical positions (lat begin / lon begin
 * / lat end / lon end); for `all`, each position expands to three columns.
 */
const buildPositionColumns = (format: ExcelCoordFormat): {
    headers: string[];
    emit: (entry: Sighting) => string[];
} => {
    const points: {label: string; jsonField: 'location_begin' | 'location_end'; isLon: boolean;}[] = [
        {label: 'Position begin latitude', jsonField: 'location_begin', isLon: false},
        {label: 'Position begin longitude', jsonField: 'location_begin', isLon: true},
        {label: 'Position end latitude', jsonField: 'location_end', isLon: false},
        {label: 'Position end longitude', jsonField: 'location_end', isLon: true}
    ];

    if (format === 'all') {
        const headers: string[] = [];
        for (const p of points) {
            headers.push(`${p.label} (decimal)`, `${p.label} (DMS)`, `${p.label} (DM)`);
        }
        return {
            headers,
            emit: (entry) => {
                const row: string[] = [];
                for (const p of points) {
                    const decKind = p.isLon ? UtilPositionToStr.LonDec : UtilPositionToStr.LatDec;
                    const dmsKind = p.isLon ? UtilPositionToStr.Lon : UtilPositionToStr.Lat;
                    const dmKind = p.isLon ? UtilPositionToStr.LonDM : UtilPositionToStr.LatDM;
                    row.push(
                        UtilPosition.getStr(entry[p.jsonField], decKind),
                        UtilPosition.getStr(entry[p.jsonField], dmsKind),
                        UtilPosition.getStr(entry[p.jsonField], dmKind)
                    );
                }
                return row;
            }
        };
    }

    const kindFor = (isLon: boolean): UtilPositionToStr => {
        switch (format) {
            case 'dms':
                return isLon ? UtilPositionToStr.Lon : UtilPositionToStr.Lat;
            case 'dm':
                return isLon ? UtilPositionToStr.LonDM : UtilPositionToStr.LatDM;
            case 'decimal':
            default:
                return isLon ? UtilPositionToStr.LonDec : UtilPositionToStr.LatDec;
        }
    };

    return {
        headers: points.map((p) => p.label),
        emit: (entry) => points.map((p) => UtilPosition.getStr(entry[p.jsonField], kindFor(p.isLon)))
    };
};

/**
 * Build the sightings XLSX export.
 * Wire-compatible with the legacy /json/sightings/list/excel handler when called
 * with no options:
 *   - same column order, same labels, same value formatting (calves/photo_taken via
 *     UtilSelect, distance via UtilDistanceCoast, lat/lon via UtilPosition with the
 *     LatDec/LonDec swap fixed 2026-05-08).
 *   - same row scope: every non-deleted sighting, ordered date desc, tour_start desc.
 *
 * With `opts.columns`, the caller picks which columns the sheet contains (same key set
 * the frontend's column picker emits). With `opts.coordFormat`, the position columns are
 * rendered as decimal degrees, DMS, DM, or all three formats side-by-side.
 *
 * A second sheet "Info" documents the export — generation timestamp, total row count,
 * picked columns, coord format, and a note about the lat/lon swap fix.
 */
export class Excel {

    /**
     * @param {ExcelBuildOptions} opts
     * @return {Buffer}
     */
    public static async build(opts: ExcelBuildOptions = {}): Promise<Buffer> {
        const sightingRepository = SightingRepository.getInstance();

        const requestedColumns = (opts.columns && opts.columns.length > 0)
            ? new Set(opts.columns)
            : null;
        const coordFormat: ExcelCoordFormat = opts.coordFormat ?? 'decimal';

        const standardKeys = STANDARD_KEYS_ORDERED.filter(
            (k) => requestedColumns === null || requestedColumns.has(k)
        );
        const optionalKeys = OPTIONAL_KEYS_ORDERED.filter(
            (k) => requestedColumns !== null && requestedColumns.has(k)
        );

        const needsOrganization = optionalKeys.includes('organization');
        const needsExtended = optionalKeys.some((k) => EXTENDED_KEYS.has(k));

        const [
            vehicles,
            drivers,
            speciesAll,
            users,
            behStates,
            encounterCategories,
            organizations
        ] = await Promise.all([
            VehicleRepository.getInstance().findAll(),
            VehicleDriverRepository.getInstance().findAllWithUser(),
            SpeciesRepository.getInstance().findAll(),
            UserRepository.getInstance().findAll(),
            BehaviouralStatesRepository.getInstance().findAll(),
            EncounterCategoriesRepository.getInstance().findAll(),
            needsOrganization ? OrganizationRepository.getInstance().findAll() : Promise.resolve([])
        ]);

        const vehiclesById = new Map<number, string>();
        for (const v of vehicles) {
            vehiclesById.set(v.id, v.description);
        }

        const driversById = new Map<number, string>();
        for (const d of drivers) {
            driversById.set(d.id, d.user_full_name);
        }

        const speciesNamesById = new Map<number, string>();
        for (const s of speciesAll) {
            speciesNamesById.set(s.id, s.name);
        }

        const usersById = new Map<number, string>();
        for (const u of users) {
            usersById.set(u.id, u.full_name);
        }

        const behStatesById = new Map<number, string>();
        for (const b of behStates) {
            behStatesById.set(b.id, b.name);
        }

        const enCatsById = new Map<number, string>();
        for (const c of encounterCategories) {
            enCatsById.set(c.id, c.name);
        }

        const orgDescriptionById = new Map<number, string>();
        for (const o of organizations) {
            orgDescriptionById.set(o.id, o.description);
        }

        const filter = opts.filter;

        const {rows} = await sightingRepository.findActiveList(
            {
                date: 'DESC',
                tour_start: 'DESC'
            },
            undefined,
            undefined,
            undefined,
            filter
        );

        const extendedBySightingId = new Map<number, SightingExtended>();
        if (needsExtended && rows.length > 0) {
            const extRows = await SightingExtendedRepository.getInstance().findManyBySightings(
                rows.map((r) => r.id)
            );
            for (const ext of extRows) {
                extendedBySightingId.set(ext.sighting_id, ext);
            }
        }

        const positionCols = buildPositionColumns(coordFormat);

        // Header --------------------------------------------------------------
        const header: string[] = [];

        for (const key of standardKeys) {
            header.push(STANDARD_LABELS[key] ?? key);

            // Position-column block sits between `duration_until` and
            // `distance_estimation`. Insert it the first time we cross that
            // boundary; if the user deselected one or both neighbours we
            // append it after the last column before `distance_estimation`
            // anyway by keying off the duration_until marker.
            if (key === 'duration_until') {
                header.push(...positionCols.headers);
            }
        }

        // If duration_until was deselected, position cols were never injected.
        // Append them at the end of the standard block in that case.
        if (!standardKeys.includes('duration_until')) {
            header.push(...positionCols.headers);
        }

        for (const key of optionalKeys) {
            header.push(OPTIONAL_LABELS[key] ?? key);
        }

        const data: (string|number)[][] = [header];

        // Rows ---------------------------------------------------------------
        for (const entry of rows) {
            const row: (string|number)[] = [];
            const ext = extendedBySightingId.get(entry.id) ?? null;

            const distance = UtilDistanceCoast.meterToM(parseFloat(entry.distance_coast) || 0.0, true);
            const date = moment(entry.date);
            const speciesName = (speciesNamesById.get(entry.species_id) ?? '').split(',')[0];
            const beaufortWind = entry.beaufort_wind_n !== ''
                ? entry.beaufort_wind_n
                : `${entry.beaufort_wind}`;

            for (const key of standardKeys) {
                row.push(Excel._emitStandard(key, entry, {
                    vehiclesById,
                    driversById,
                    usersById,
                    behStatesById,
                    enCatsById,
                    speciesNamesById,
                    speciesName,
                    beaufortWind,
                    distance,
                    date
                }));

                if (key === 'duration_until') {
                    row.push(...positionCols.emit(entry));
                }
            }

            if (!standardKeys.includes('duration_until')) {
                row.push(...positionCols.emit(entry));
            }

            for (const key of optionalKeys) {
                row.push(Excel._emitOptional(key, entry, ext, orgDescriptionById));
            }

            data.push(row);
        }

        // Info sheet ---------------------------------------------------------
        const infoSheet: WorkSheet<unknown> = {
            name: 'Info',
            data: Excel._buildInfoData(rows.length, standardKeys, optionalKeys, coordFormat, filter),
            options: {}
        };

        return xlsx.build([
            {
                name: 'Sightings',
                data: data,
                options: {}
            },
            infoSheet
        ]);
    }

    /**
     * Validate and normalise an `ExcelCoordFormat` from a query string. Falls
     * back to `decimal` for unknown / missing values.
     */
    public static parseCoordFormat(raw: unknown): ExcelCoordFormat {
        if (typeof raw === 'string' && (VALID_COORD_FORMATS as string[]).includes(raw)) {
            return raw as ExcelCoordFormat;
        }
        return 'decimal';
    }

    /**
     * Parse a comma-separated `?columns=` query string into a list of column
     * keys. Returns an empty array (which the build interprets as "all
     * standard columns") when the input is missing or unusable.
     */
    public static parseColumns(raw: unknown): string[] {
        if (typeof raw !== 'string' || raw.trim() === '') {
            return [];
        }
        return raw.split(',').map((s) => s.trim()).filter((s) => s !== '');
    }

    /**
     * Build a {@link SightingFilterCriteria} from the express query bag.
     * Only fields that arrived as non-empty strings are forwarded — the
     * route's contract is "missing key = no filter for that column".
     * Numeric ids that fail to parse or come back ≤ 0 are dropped so the
     * caller can't accidentally narrow the export to nothing.
     */
    public static parseFilter(query: Record<string, unknown>): SightingFilterCriteria {
        const out: SightingFilterCriteria = {};

        const readString = (key: string): string | undefined => {
            const v = query[key];
            if (typeof v === 'string') {
                const trimmed = v.trim();
                return trimmed === '' ? undefined : trimmed;
            }
            return undefined;
        };

        const readPositiveInt = (key: string): number | undefined => {
            const v = query[key];
            if (typeof v !== 'string') {
                return undefined;
            }
            const parsed = parseInt(v, 10);
            return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
        };

        const periodFrom = readString('period_from');
        if (periodFrom !== undefined) {
            out.period_from = periodFrom;
        }

        const periodTo = readString('period_to');
        if (periodTo !== undefined) {
            out.period_to = periodTo;
        }

        const speciesId = readPositiveInt('species_id');
        if (speciesId !== undefined) {
            out.species_id = speciesId;
        }

        const organizationId = readPositiveInt('organization_id');
        if (organizationId !== undefined) {
            out.organization_id = organizationId;
        }

        const vehicleId = readPositiveInt('vehicle_id');
        if (vehicleId !== undefined) {
            out.vehicle_id = vehicleId;
        }

        const vehicleDriverId = readPositiveInt('vehicle_driver_id');
        if (vehicleDriverId !== undefined) {
            out.vehicle_driver_id = vehicleDriverId;
        }

        const search = readString('search');
        if (search !== undefined) {
            out.search = search;
        }

        return out;
    }

    private static _emitStandard(
        key: string,
        entry: Sighting,
        ctx: {
            vehiclesById: Map<number, string>;
            driversById: Map<number, string>;
            usersById: Map<number, string>;
            behStatesById: Map<number, string>;
            enCatsById: Map<number, string>;
            speciesNamesById: Map<number, string>;
            speciesName: string;
            beaufortWind: string;
            distance: string;
            date: moment.Moment;
        }
    ): string|number {
        switch (key) {
            case 'id': return `${entry.id}`;
            case 'date': return ctx.date.format('YYYY/MM/DD');
            case 'tour_start': return `${entry.tour_start}`;
            case 'tour_end': return `${entry.tour_end}`;
            case 'boat': return ctx.vehiclesById.get(entry.vehicle_id) ?? '';
            case 'skipper': return ctx.driversById.get(entry.vehicle_driver_id) ?? '';
            case 'observer': return ctx.usersById.get(entry.creater_id) ?? '';
            case 'beaufort': return ctx.beaufortWind;
            case 'species': return ctx.speciesName;
            case 'animal_count': return `${entry.species_count}`;
            case 'duration_from': return `${entry.duration_from}`;
            case 'duration_until': return `${entry.duration_until}`;
            case 'distance_estimation': return UtilSelect.getSelectStr(entry.distance_coast_estimation_gps);
            case 'distance_coast': return ctx.distance;
            case 'juveniles': return UtilSelect.getSelectStr(entry.juveniles);
            case 'calves': return UtilSelect.getSelectStr(entry.calves);
            case 'newborns': return UtilSelect.getSelectStr(entry.newborns);
            case 'behaviour': return buildBehaviourStr(entry.behaviours, ctx.behStatesById);
            case 'group_structure': return GROUP_STRUCTURE[entry.group_structure_id] ?? '';
            case 'subgroups': return UtilSelect.getSelectStr(entry.subgroups);
            case 'reaction': return ctx.enCatsById.get(entry.reaction_id) ?? '';
            case 'freq_behaviour': return buildFreqStr(entry.freq_behaviour);
            case 'photo_taken': return UtilSelect.getSelectStr(entry.photo_taken);
            case 'recognizable_animals': return `${entry.recognizable_animals}`;
            case 'other_species': return buildOtherSpeciesStr(entry.other_species, ctx.speciesNamesById);
            case 'other': return `${entry.other}`;
            case 'other_vehicle': return `${entry.other_vehicle}`;
            case 'note': return `${entry.note}`;
            default: return '';
        }
    }

    private static _emitOptional(
        key: string,
        entry: Sighting,
        ext: SightingExtended | null,
        orgDescriptionById: Map<number, string>
    ): string|number {
        switch (key) {
            case 'unid': return entry.unid;
            case 'sighting_type': return SIGHTING_TYPE_LABELS[entry.sighting_type] ?? `${entry.sighting_type}`;
            case 'organization': return orgDescriptionById.get(entry.organization_id) ?? '';
            case 'create_datetime': return formatTimestamp(entry.create_datetime);
            case 'update_datetime': return formatTimestamp(entry.update_datetime);
            case 'tour_fid': return entry.tour_fid;
            case 'depth_m': return formatNumeric(ext?.depth_m ?? null);
            case 'depth_provider': return ext?.provenance?.depth_m ?? '';
            case 'sst_c_day': return formatNumeric(ext?.sst_c_day ?? null);
            case 'air_temperature_c_day': return formatNumeric(ext?.air_temperature_c_day ?? null);
            case 'uv_index_day': return formatNumeric(ext?.uv_index_day ?? null);
            case 'wave_height_m_day': return formatNumeric(ext?.wave_height_m_day ?? null);
            case 'wave_period_s_day': return formatNumeric(ext?.wave_period_s_day ?? null);
            case 'wave_direction_deg_day': return formatNumeric(ext?.wave_direction_deg_day ?? null);
            case 'sst_c_hour': return formatNumeric(ext?.sst_c_hour ?? null);
            case 'air_temperature_c_hour': return formatNumeric(ext?.air_temperature_c_hour ?? null);
            case 'uv_index_hour': return formatNumeric(ext?.uv_index_hour ?? null);
            case 'wave_height_m_hour': return formatNumeric(ext?.wave_height_m_hour ?? null);
            case 'wave_period_s_hour': return formatNumeric(ext?.wave_period_s_hour ?? null);
            case 'wave_direction_deg_hour': return formatNumeric(ext?.wave_direction_deg_hour ?? null);
            default: return '';
        }
    }

    private static _buildInfoData(
        rowCount: number,
        standardKeys: string[],
        optionalKeys: string[],
        coordFormat: ExcelCoordFormat,
        filter: SightingFilterCriteria | undefined
    ): (string|number)[][] {
        const generatedAt = moment().format('YYYY-MM-DD HH:mm:ss');
        const info: (string|number)[][] = [
            ['MWPA — Sightings Excel Export'],
            [],
            ['Generated at', generatedAt],
            ['Sighting rows', rowCount],
            ['Coordinate format', coordFormat],
            [],
            ['Note', 'UtilPosition LatDec/LonDec returned the wrong axis until 2026-05-08;'
                + ' this export uses the corrected mapping (LatDec → latitude, LonDec → longitude).'],
            []
        ];

        const filterRows: (string|number)[][] = [];
        if (filter) {
            if (filter.period_from !== undefined) {
                filterRows.push(['period_from', filter.period_from]);
            }
            if (filter.period_to !== undefined) {
                filterRows.push(['period_to', filter.period_to]);
            }
            if (filter.species_id !== undefined) {
                filterRows.push(['species_id', filter.species_id]);
            }
            if (filter.organization_id !== undefined) {
                filterRows.push(['organization_id', filter.organization_id]);
            }
            if (filter.vehicle_id !== undefined) {
                filterRows.push(['vehicle_id', filter.vehicle_id]);
            }
            if (filter.vehicle_driver_id !== undefined) {
                filterRows.push(['vehicle_driver_id', filter.vehicle_driver_id]);
            }
            if (filter.search !== undefined) {
                filterRows.push(['search', filter.search]);
            }
        }

        info.push(['Active filter']);
        if (filterRows.length === 0) {
            info.push(['(none — all non-deleted sightings)']);
        } else {
            info.push(...filterRows);
        }

        info.push([], ['Standard columns'], ...standardKeys.map((k) => [k, STANDARD_LABELS[k] ?? k]));

        if (optionalKeys.length > 0) {
            info.push([], ['Optional columns']);
            for (const k of optionalKeys) {
                info.push([k, OPTIONAL_LABELS[k] ?? k]);
            }
        }

        return info;
    }

}