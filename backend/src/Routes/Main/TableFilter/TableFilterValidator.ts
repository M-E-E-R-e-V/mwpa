import {TableFilterEntry, TableFilterTable} from 'mwpa_schemas';

/**
 * Result of {@link TableFilterValidator.validate}: either an error message
 * or the normalized name.
 */
export type TableFilterValidation = {
    error: string;
    name: string;
};

/**
 * DB-free checks for a preset save request (kept separate so it can be
 * unit tested without a database).
 */
export class TableFilterValidator {

    /**
     * Upper bound for the settings JSON (sorting + a handful of filters).
     */
    public static readonly MAX_SETTINGS_LENGTH = 8192;

    /**
     * Max. stored name length.
     */
    public static readonly MAX_NAME_LENGTH = 128;

    /**
     * Validate a save request.
     * @param {TableFilterEntry} req
     * @returns {TableFilterValidation} error '' = valid
     */
    public static validate(req: TableFilterEntry): TableFilterValidation {
        const name = req.name.trim().substring(0, TableFilterValidator.MAX_NAME_LENGTH);

        if (name === '') {
            return {error: 'Name is required', name: name};
        }

        if (!Object.values(TableFilterTable).includes(req.table_name as TableFilterTable)) {
            return {error: 'Unknown table', name: name};
        }

        if (req.settings.length > TableFilterValidator.MAX_SETTINGS_LENGTH) {
            return {error: 'Settings too large', name: name};
        }

        try {
            const parsed: unknown = JSON.parse(req.settings);

            if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
                return {error: 'Settings must be a JSON object', name: name};
            }
        } catch {
            return {error: 'Settings are no valid JSON', name: name};
        }

        return {error: '', name: name};
    }

}