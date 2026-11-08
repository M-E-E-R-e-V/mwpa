/**
 * Cell-value helpers for the sighting_old import. ExcelJS cell values are
 * loosely typed (number | string | Date | rich text | null), so everything
 * here takes `unknown` and normalizes defensively.
 */
export class ImportValue {

    /**
     * Normalize a free-text name for matching: lower-case, strip apostrophes,
     * collapse everything non-alphanumeric to single spaces.
     */
    public static norm(v: unknown): string {
        return String(v === null || v === undefined ? '' : v)
        .toLowerCase()
        .replace(/[`´'’]/gu, '')
        .replace(/[^a-z0-9]+/gu, ' ')
        .trim();
    }

    public static toIsoDate(v: unknown): string | null {
        return v instanceof Date ? v.toISOString().slice(0, 10) : null;
    }

    public static toHHmm(v: unknown): string {
        if (!(v instanceof Date)) {
            return '';
        }

        const h = String(v.getUTCHours()).padStart(2, '0');
        const m = String(v.getUTCMinutes()).padStart(2, '0');

        return `${h}:${m}`;
    }

    public static minutesOf(hhmm: string | null | undefined): number | null {
        const m = (/^(\d{1,2}):(\d{2})/u).exec(hhmm ?? '');

        return m ? (parseInt(m[1], 10) * 60) + parseInt(m[2], 10) : null;
    }

    public static numOrNull(v: unknown): number | null {
        if (v === null || v === undefined || `${v}`.trim() === '') {
            return null;
        }

        const n = typeof v === 'number' ? v : parseFloat(`${v}`.replace(',', '.'));

        return Number.isFinite(n) ? n : null;
    }

    public static intOr(v: unknown, def: number): number {
        const n = ImportValue.numOrNull(v);

        return n === null ? def : Math.round(n);
    }

    public static str(v: unknown): string {
        return (v === null || v === undefined ? '' : `${v}`).trim().replace(/^\s*$/u, '');
    }

    public static yesTo1(v: unknown): number {
        return (/^(yes|ja|1|x|true)$/iu).test(ImportValue.str(v)) ? 1 : 0;
    }

}