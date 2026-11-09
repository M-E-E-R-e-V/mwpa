/**
 * Parts of a species name stored as "English, German (Latin)".
 */
export type SpeciesNameParts = {

    /**
     * Common (English) name, e.g. "Bottlenose Dolphin" — the full name when
     * it does not follow the convention
     */
    common: string;

    /**
     * Local (German) name, '' when missing
     */
    local: string;

    /**
     * Scientific name from the trailing parentheses, '' when missing
     */
    scientific: string;
};

/**
 * Splits the species name convention "English, German (Latin)" — e.g.
 * "Bottlenose Dolphin, Grosser Tümmler (Tursiops truncatus)" — into its
 * parts for display. Names that don't follow it (e.g. "Beaked Whale") come
 * back unchanged as `common`.
 */
export class UtilSpeciesName {

    /**
     * Parse a species name.
     * @param {string} name
     * @return {SpeciesNameParts}
     */
    public static parse(name: string): SpeciesNameParts {
        let rest = name.trim();
        let scientific = '';

        const latin = (/\(([^()]+)\)\s*$/u).exec(rest);

        if (latin) {
            scientific = UtilSpeciesName._normalizeScientific(latin[1] ?? '');
            rest = rest.slice(0, latin.index).trim();
        }

        let common = rest;
        let local = '';
        const comma = rest.indexOf(',');

        if (comma > 0) {
            common = rest.slice(0, comma).trim();
            local = rest.slice(comma + 1).trim();
        }

        if (common === '') {
            common = name.trim();
        }

        return {common, local, scientific};
    }

    /**
     * Binomial convention: genus capitalised, epithet lower-case
     * ("Hyperoodon Ampullatus" → "Hyperoodon ampullatus").
     * @param {string} value
     * @return {string}
     * @protected
     */
    protected static _normalizeScientific(value: string): string {
        const words = value.trim().split(/\s+/u);

        return words.map((word, index) => index === 0 ? word : word.toLowerCase()).join(' ');
    }

}