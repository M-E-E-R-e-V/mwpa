import {SightingTableFilterSettings} from 'mwpa_schemas';

/**
 * Snapshot of the active sighting list filter. Empty strings / 0 mean "no
 * filter for this field" — the consumer drops those before sending to the
 * backend.
 */
export type SightingFilterValues = {
    period_from: string;
    period_to: string;
    species_id: number;
    organization_id: number;
    vehicle_id: number;
    vehicle_driver_id: number;
    search: string;
    include_old: boolean;
};

/**
 * Sortable list columns.
 */
export type SightingSortKey = 'id' | 'tour_id' | 'date' | 'tour_start' | 'create_datetime' | 'update_datetime';

/**
 * Period of a preset: none, fixed dates, or relative to "today" (resolved
 * every time the preset is opened, so "current year" never goes stale).
 */
export type SightingPeriodMode = '' | 'absolute' | 'current_year' | 'last_year' | 'last_30_days' | 'last_90_days' | 'last_365_days';

/**
 * Resolved period (YYYY-MM-DD, '' = open end).
 */
export type SightingPeriod = {
    from: string;
    to: string;
};

/**
 * Pure helpers for sighting list presets (settings JSON <-> list state).
 * DOM-free so they can be unit tested.
 */
export class SightingTableFilter {

    public static readonly SORT_KEYS: SightingSortKey[] = [
        'id',
        'tour_id',
        'date',
        'tour_start',
        'create_datetime',
        'update_datetime'
    ];

    public static readonly PERIOD_MODES: SightingPeriodMode[] = [
        '',
        'absolute',
        'current_year',
        'last_year',
        'last_30_days',
        'last_90_days',
        'last_365_days'
    ];

    /**
     * Empty filter (= plain list).
     * @returns {SightingFilterValues}
     */
    public static emptyValues(): SightingFilterValues {
        return {
            period_from: '',
            period_to: '',
            species_id: 0,
            organization_id: 0,
            vehicle_id: 0,
            vehicle_driver_id: 0,
            search: '',
            include_old: false
        };
    }

    /**
     * Parse a stored settings JSON. Tolerant: unknown / wrongly typed fields
     * are dropped, so an old or hand-edited preset still opens.
     * @param {string} json
     * @returns {SightingTableFilterSettings|null} null = not a JSON object
     */
    public static parse(json: string): SightingTableFilterSettings|null {
        let data: unknown;

        try {
            data = JSON.parse(json);
        } catch {
            return null;
        }

        if (data === null || typeof data !== 'object' || Array.isArray(data)) {
            return null;
        }

        const raw = data as Record<string, unknown>;
        const str = (key: string): string|undefined => typeof raw[key] === 'string' ? raw[key] as string : undefined;
        const num = (key: string): number|undefined => 
            typeof raw[key] === 'number' && Number.isFinite(raw[key]) ? raw[key] as number : undefined
        ;

        const settings: SightingTableFilterSettings = {};
        const sortKey = str('sort_key');
        const sortDir = str('sort_dir');
        const periodMode = str('period_mode');

        if (sortKey !== undefined && (SightingTableFilter.SORT_KEYS as string[]).includes(sortKey)) {
            settings.sort_key = sortKey;
        }

        if (sortDir === 'asc' || sortDir === 'desc') {
            settings.sort_dir = sortDir;
        }

        if (periodMode !== undefined && (SightingTableFilter.PERIOD_MODES as string[]).includes(periodMode)) {
            settings.period_mode = periodMode;
        }

        for (const key of ['period_from', 'period_to', 'search'] as const) {
            const value = str(key);

            if (value !== undefined) {
                settings[key] = value;
            }
        }

        for (const key of ['species_id', 'organization_id', 'vehicle_id', 'vehicle_driver_id'] as const) {
            const value = num(key);

            if (value !== undefined) {
                settings[key] = value;
            }
        }

        if (typeof raw.include_old === 'boolean') {
            settings.include_old = raw.include_old;
        }

        return settings;
    }

    /**
     * Format a local date as YYYY-MM-DD.
     * @param {Date} d
     * @returns {string}
     */
    public static isoDate(d: Date): string {
        const mm = `${d.getMonth() + 1}`.padStart(2, '0');
        const dd = `${d.getDate()}`.padStart(2, '0');

        return `${d.getFullYear()}-${mm}-${dd}`;
    }

    /**
     * Resolve a period mode to concrete dates relative to `now`.
     * @param {string} mode
     * @param {string} from used for 'absolute'
     * @param {string} to used for 'absolute'
     * @param {Date} now
     * @returns {SightingPeriod}
     */
    public static resolvePeriod(mode: string, from: string, to: string, now: Date): SightingPeriod {
        const year = now.getFullYear();
        const daysBack = (days: number): SightingPeriod => {
            const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - days);

            return {from: SightingTableFilter.isoDate(start), to: SightingTableFilter.isoDate(now)};
        };

        switch (mode) {
            case 'absolute':
                return {from, to};

            case 'current_year':
                return {from: `${year}-01-01`, to: `${year}-12-31`};

            case 'last_year':
                return {from: `${year - 1}-01-01`, to: `${year - 1}-12-31`};

            case 'last_30_days':
                return daysBack(30);

            case 'last_90_days':
                return daysBack(90);

            case 'last_365_days':
                return daysBack(365);

            default:
                return {from: '', to: ''};
        }
    }

    /**
     * Preset settings -> list filter values (period resolved against `now`).
     * @param {SightingTableFilterSettings} settings
     * @param {Date} now
     * @returns {SightingFilterValues}
     */
    public static toFilterValues(settings: SightingTableFilterSettings, now: Date): SightingFilterValues {
        const period = SightingTableFilter.resolvePeriod(
            settings.period_mode ?? '',
            settings.period_from ?? '',
            settings.period_to ?? '',
            now
        );

        return {
            period_from: period.from,
            period_to: period.to,
            species_id: settings.species_id ?? 0,
            organization_id: settings.organization_id ?? 0,
            vehicle_id: settings.vehicle_id ?? 0,
            vehicle_driver_id: settings.vehicle_driver_id ?? 0,
            search: settings.search ?? '',
            include_old: settings.include_old ?? false
        };
    }

    /**
     * True when at least one filter field is set.
     * @param {SightingFilterValues} v
     * @returns {boolean}
     */
    public static isActive(v: SightingFilterValues): boolean {
        return v.period_from !== ''
            || v.period_to !== ''
            || v.species_id > 0
            || v.organization_id > 0
            || v.vehicle_id > 0
            || v.vehicle_driver_id > 0
            || v.search !== ''
            || v.include_old;
    }

}