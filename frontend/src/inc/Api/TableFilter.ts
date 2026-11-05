import {
    TableFilterEntry,
    TableFilterListResponse,
    TableFilterSaveResponse
} from 'mwpa_schemas';
import {NetFetch} from '../Net/NetFetch';
import {UnauthorizedError} from './Error/UnauthorizedError';
import {StatusCodes} from './Status/StatusCodes';
import {DefaultReturn} from './Types/DefaultReturn';

export type {TableFilterEntry};

/**
 * Frontend table keys with saved filter presets (mirrors the schema enum
 * TableFilterTable — kept as a string constant so the bundle doesn't pull in
 * the schemas runtime).
 */
export const TABLE_FILTER_SIGHTING = 'sighting';

/**
 * TableFilter API — private, named list filter presets of the current user.
 */
export class TableFilter {

    /**
     * Throw on non-OK responses (UnauthorizedError on 401).
     * @param {DefaultReturn|null} result
     * @param {string} fallback
     * @protected
     */
    protected static _check(result: DefaultReturn|null, fallback: string): void {
        if (!result || !result.statusCode) {
            throw new Error(fallback);
        }

        if (result.statusCode === StatusCodes.UNAUTHORIZED) {
            throw new UnauthorizedError();
        }

        if (result.statusCode !== StatusCodes.OK) {
            throw new Error(result.msg ?? fallback);
        }
    }

    /**
     * Presets of the current user for one table.
     * @param {string} tableName
     * @returns {Promise<TableFilterEntry[]>}
     */
    public static async getList(tableName: string): Promise<TableFilterEntry[]> {
        const result = await NetFetch.postData('/json/user/tablefilter/list', {table_name: tableName}) as TableFilterListResponse|null;

        TableFilter._check(result, 'Filter list failed');

        return result?.list ?? [];
    }

    /**
     * Create (unid '') or update a preset; returns the unid.
     * @param {TableFilterEntry} entry
     * @returns {Promise<string>}
     */
    public static async save(entry: TableFilterEntry): Promise<string> {
        const result = await NetFetch.postData('/json/user/tablefilter/save', entry) as TableFilterSaveResponse|null;

        TableFilter._check(result, 'Filter save failed');

        return result?.unid ?? '';
    }

    /**
     * Delete a preset.
     * @param {string} unid
     */
    public static async delete(unid: string): Promise<void> {
        const result = await NetFetch.postData('/json/user/tablefilter/delete', {unid}) as DefaultReturn|null;

        TableFilter._check(result, 'Filter delete failed');
    }

}