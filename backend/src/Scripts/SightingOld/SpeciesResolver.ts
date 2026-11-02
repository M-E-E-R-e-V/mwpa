import {ImportValue} from './ImportValue.js';

/**
 * Species row as loaded from the app's `species` table.
 */
export type SpeciesRow = {
    id: number;
    name: string;
};

/**
 * Resolves the spreadsheet's free-text species names to app species ids.
 * App species names are "English, Latin"; matching uses the normalized
 * pre-comma English part plus a small synonym table for the non-trivial
 * spreadsheet spellings. Unresolvable names are counted in `unresolved`.
 */
export class SpeciesResolver {

    /**
     * Excel (normalized) → app species English name (normalized).
     */
    public static readonly SYNONYM: Readonly<Record<string, string>> = {
        'short finned pilot whale': 'pilot whale',
        'spotted dolphin': 'atlantic spotted dolphin',
        'commons dolphins': 'common dolphin',
        'common dolphins': 'common dolphin',
        'cuvier beaked whale': 'cuviers beaked whale',
        'unidentified whale': 'unknown',
        'unidentified dolphin': 'unknown',
        'unidentified cetaceen': 'unknown',
        'unidentified cetacean': 'unknown'
    };

    public readonly unresolved: Map<string, number> = new Map<string, number>();

    private readonly _engToId: Map<string, number> = new Map<string, number>();

    public constructor(speciesRows: SpeciesRow[]) {
        for (const r of speciesRows) {
            this._engToId.set(ImportValue.norm(String(r.name).split(',')[0]), r.id);
        }
    }

    /**
     * Returns the species id, or 0 when the name is empty or unresolvable.
     */
    public resolve(raw: unknown): number {
        const n = ImportValue.norm(raw);

        if (n === '') {
            return 0;
        }

        // mixed "x / y" → cannot resolve to a single species
        if (n.includes(' / ') || (/\bor\b/u).test(n)) {
            this._markUnresolved(raw);
            return 0;
        }

        const key = SpeciesResolver.SYNONYM[n] ?? n;
        const id = this._engToId.get(key);

        if (id === undefined) {
            this._markUnresolved(raw);
            return 0;
        }

        return id;
    }

    private _markUnresolved(raw: unknown): void {
        const key = String(raw);
        this.unresolved.set(key, (this.unresolved.get(key) ?? 0) + 1);
    }

}