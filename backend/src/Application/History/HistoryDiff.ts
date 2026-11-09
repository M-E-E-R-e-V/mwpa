/**
 * One changed field.
 */
export type HistoryChange = {
    field: string;
    old_value: string;
    new_value: string;
};

/**
 * HistoryDiff
 *
 * Pure (DB-free) helpers for the change history: snapshot the tracked
 * fields of a row and compare two snapshots. Values are compared in a
 * canonical text form, so 1 / '1', null / '', a re-serialised JSON value
 * (5.0 / 5) or an empty JSON structure ('{}', '{"0":""}') don't count as
 * a change. The history keeps the raw values.
 */
export class HistoryDiff {

    /**
     * Text form of a value for the history ('' for null / undefined).
     * @param {unknown} value
     * @return {string}
     */
    public static text(value: unknown): string {
        if (value === null || value === undefined) {
            return '';
        }

        if (typeof value === 'boolean') {
            return value ? '1' : '0';
        }

        if (typeof value === 'object') {
            return JSON.stringify(value);
        }

        return `${value as string | number}`;
    }

    /**
     * Canonical form for the comparison: JSON is parsed and re-serialised,
     * an empty JSON structure (only empty values) or JSON null becomes ''.
     * Other text stays as it is.
     * @param {string} value
     * @return {string}
     */
    public static canonical(value: string): string {
        const text = value.trim();

        if (text === '' || !(/^[[{]|^null$/u).test(text)) {
            return value;
        }

        try {
            const data = JSON.parse(text) as unknown;
            return HistoryDiff._isEmpty(data) ? '' : JSON.stringify(data);
        } catch {
            return value;
        }
    }

    /**
     * True for null, '' and objects / arrays that only hold such values.
     * @param {unknown} data
     * @return {boolean}
     */
    protected static _isEmpty(data: unknown): boolean {
        if (data === null || data === '') {
            return true;
        }

        if (typeof data === 'object') {
            return Object.values(data as Record<string, unknown>).every((item) => HistoryDiff._isEmpty(item));
        }

        return false;
    }

    /**
     * Text snapshot of the given fields of a row.
     * @param {object} row
     * @param {readonly string[]} fields
     * @return {Record<string, string>}
     */
    public static snapshot(row: object, fields: readonly string[]): Record<string, string> {
        const values = row as Record<string, unknown>;
        const snapshot: Record<string, string> = {};

        for (const field of fields) {
            snapshot[field] = HistoryDiff.text(values[field]);
        }

        return snapshot;
    }

    /**
     * Fields whose value differs between two snapshots, in field order.
     * @param {Record<string, string>} before
     * @param {Record<string, string>} after
     * @param {readonly string[]} fields
     * @return {HistoryChange[]}
     */
    public static diff(before: Record<string, string>, after: Record<string, string>, fields: readonly string[]): HistoryChange[] {
        const changes: HistoryChange[] = [];

        for (const field of fields) {
            const oldValue = before[field] ?? '';
            const newValue = after[field] ?? '';

            if (HistoryDiff.canonical(oldValue) !== HistoryDiff.canonical(newValue)) {
                changes.push({field: field, old_value: oldValue, new_value: newValue});
            }
        }

        return changes;
    }

}