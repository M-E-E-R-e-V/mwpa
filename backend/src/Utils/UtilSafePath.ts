import Path from 'path';

/**
 * Path-safety helpers. Centralises the defence against path traversal so every
 * handler that joins request-derived strings onto a server directory rejects
 * `..`, path separators, absolute paths and NUL bytes the same way.
 */
export class UtilSafePath {

    /**
     * Validate that `name` is a single, safe path segment (a bare filename).
     * Returns the name unchanged when safe, otherwise null. Rejects empty
     * strings, NUL bytes, `.`/`..`, and anything carrying a directory
     * component (so `../x`, `/etc/passwd`, `a/b` and `..%2f`-decoded input all
     * fail — `Path.basename` differs from the input in each case).
     * @param {unknown} name
     * @return {string | null}
     */
    public static safeSegment(name: unknown): string | null {
        if (typeof name !== 'string' || name.length === 0) {
            return null;
        }

        if (name.includes('\0')) {
            return null;
        }

        if (name === '.' || name === '..') {
            return null;
        }

        if (name !== Path.basename(name)) {
            return null;
        }

        return name;
    }

    /**
     * Confirm that `target` resolves to a path inside `baseDir` (or baseDir
     * itself) — a defence-in-depth containment check after a join.
     * @param {string} baseDir
     * @param {string} target
     * @return {boolean}
     */
    public static isInside(baseDir: string, target: string): boolean {
        const base = Path.resolve(baseDir);
        const resolved = Path.resolve(target);
        return resolved === base || resolved.startsWith(base + Path.sep);
    }

}