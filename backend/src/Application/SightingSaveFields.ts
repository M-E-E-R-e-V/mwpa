import {SightingSaveRequest} from 'mwpa_schemas';

/**
 * The optional detail fields of the web sighting dialog, already checked.
 * Undefined means "not sent" (an update keeps the stored value).
 */
export type SightingDetailFields = {
    photo_taken?: number;
    distance_coast_estimation_gps?: number;
    juveniles?: number;
    calves?: number;
    newborns?: number;
    subgroups?: number;
    group_structure_id?: number;
    behaviours?: string;
    freq_behaviour?: string;
    recognizable_animals?: string;
    other_species?: string;
};

/**
 * SightingSaveFields
 *
 * Pure (DB-free) checks of the web sighting save payload: required fields,
 * the yes/no/unknown fields (-1 / 0 / 1), group structure (0..4) and the
 * JSON columns. The JSON columns are re-serialised in the shape the mobile
 * app writes (id maps `{"0":"5"}`, tag list `["a","b"]`), so web and app
 * rows look the same to List / Excel / popup.
 */
export class SightingSaveFields {

    public static readonly TRI_STATE_FIELDS = [
        'photo_taken',
        'distance_coast_estimation_gps',
        'juveniles',
        'calves',
        'newborns',
        'subgroups'
    ] as const;

    /**
     * First problem of the request, or null when it can be saved.
     * @param {SightingSaveRequest} request
     * @return {string|null}
     */
    public static check(request: SightingSaveRequest): string | null {
        if (request.vehicle_id <= 0) {
            return 'Boat is required.';
        }

        if (request.vehicle_driver_id <= 0) {
            return 'Skipper is required.';
        }

        if (request.species_id <= 0) {
            return 'Species is required.';
        }

        if (!(/^\d{4}-\d{2}-\d{2}$/u).test(request.date.trim())) {
            return 'Date is required (YYYY-MM-DD).';
        }

        const begin = request.location_begin.trim();

        if (begin === '' || begin === 'null') {
            return 'Position begin is required.';
        }

        if (request.species_count < 0) {
            return 'Number of animals must not be negative.';
        }

        for (const name of SightingSaveFields.TRI_STATE_FIELDS) {
            const value = request[name];

            if (value !== undefined && ![-1, 0, 1].includes(value)) {
                return `${name} must be -1, 0 or 1.`;
            }
        }

        const structure = request.group_structure_id;

        if (structure !== undefined && (!Number.isInteger(structure) || structure < 0 || structure > 4)) {
            return 'group_structure_id must be 0..4.';
        }

        if (request.behaviours !== undefined && SightingSaveFields.idMap(request.behaviours) === null) {
            return 'behaviours must be a JSON id map.';
        }

        if (request.other_species !== undefined && SightingSaveFields.idMap(request.other_species) === null) {
            return 'other_species must be a JSON id map.';
        }

        if (request.freq_behaviour !== undefined && SightingSaveFields.tagList(request.freq_behaviour) === null) {
            return 'freq_behaviour must be a JSON list of texts.';
        }

        return null;
    }

    /**
     * The detail fields of a checked request, normalised.
     * @param {SightingSaveRequest} request
     * @return {SightingDetailFields}
     */
    public static details(request: SightingSaveRequest): SightingDetailFields {
        const fields: SightingDetailFields = {};

        for (const name of SightingSaveFields.TRI_STATE_FIELDS) {
            if (request[name] !== undefined) {
                fields[name] = request[name];
            }
        }

        if (request.group_structure_id !== undefined) {
            fields.group_structure_id = request.group_structure_id;
        }

        if (request.behaviours !== undefined) {
            fields.behaviours = SightingSaveFields.idMap(request.behaviours) ?? '';
        }

        if (request.other_species !== undefined) {
            fields.other_species = SightingSaveFields.idMap(request.other_species) ?? '';
        }

        if (request.freq_behaviour !== undefined) {
            fields.freq_behaviour = SightingSaveFields.tagList(request.freq_behaviour) ?? '';
        }

        if (request.recognizable_animals !== undefined) {
            fields.recognizable_animals = request.recognizable_animals.trim();
        }

        return fields;
    }

    /**
     * Normalise a JSON id map (`{"0":"5","1":"7"}`, also accepts a list of
     * ids). Empty input gives ''. Duplicates and non-ids are dropped; null
     * when the input isn't such a structure.
     * @param {string} raw
     * @return {string|null}
     */
    public static idMap(raw: string): string | null {
        const text = raw.trim();

        if (text === '') {
            return '';
        }

        let data: unknown;

        try {
            data = JSON.parse(text);
        } catch {
            return null;
        }

        if (data === null || typeof data !== 'object') {
            return null;
        }

        const ids: number[] = [];

        for (const value of Object.values(data as Record<string, unknown>)) {
            const id = typeof value === 'number' ? value : parseInt(`${value}`, 10);

            if (Number.isInteger(id) && id > 0 && !ids.includes(id)) {
                ids.push(id);
            }
        }

        if (ids.length === 0) {
            return '';
        }

        const map: Record<string, string> = {};

        ids.forEach((id, index) => {
            map[`${index}`] = `${id}`;
        });

        return JSON.stringify(map);
    }

    /**
     * Normalise a JSON list of free-text tags; '' for none, null when the
     * input isn't a list of strings.
     * @param {string} raw
     * @return {string|null}
     */
    public static tagList(raw: string): string | null {
        const text = raw.trim();

        if (text === '') {
            return '';
        }

        let data: unknown;

        try {
            data = JSON.parse(text);
        } catch {
            return null;
        }

        if (!Array.isArray(data) || data.some((item) => typeof item !== 'string')) {
            return null;
        }

        const tags: string[] = [];

        for (const item of data as string[]) {
            const tag = item.trim();

            if (tag !== '' && !tags.includes(tag)) {
                tags.push(tag);
            }
        }

        return tags.length > 0 ? JSON.stringify(tags) : '';
    }

}