/**
 * Inline SVG silhouettes for the sighting species, shown in the map popover.
 *
 * There are far more species than distinct body plans, so each species is
 * matched (by keywords in its name — robust across databases where the numeric
 * ids differ) to one of a handful of morphological silhouettes: dolphin, pilot
 * whale / blackfish, orca, sperm whale, beaked whale, rorqual (large baleen
 * whale), humpback, right whale, turtle, or a generic "unknown".
 *
 * Every silhouette is a group of same-fill shapes (so `fill` colours the whole
 * animal), drawn facing left in a `0 0 122 50` viewBox.
 */
export class UtilSpeciesSilhouette {

    /**
     * Silhouette key → inner SVG markup (shapes share the `<svg>` fill).
     * @protected
     */
    protected static readonly _SHAPES: Record<string, string> = {
        dolphin: '<path d="M6,27 Q14,24 24,23 Q40,14 70,18 Q96,21 110,25 Q96,29 70,32 Q40,36 24,28 Q14,28 6,27 Z"/>' +
            '<path d="M58,19 Q64,4 72,19 Z"/><polygon points="108,22 121,15 116,25 121,35 108,28"/>' +
            '<path d="M46,31 Q52,44 60,32 Z"/>',
        rorqual: '<path d="M4,26 Q20,21 45,20 Q80,19 110,25 Q80,31 45,30 Q20,30 4,26 Z"/>' +
            '<path d="M92,22 Q96,14 101,22 Z"/><polygon points="108,22 121,16 117,25 121,34 108,29"/>' +
            '<path d="M40,30 Q46,40 53,31 Z"/>',
        humpback: '<path d="M6,25 Q20,19 46,19 Q82,19 110,26 Q82,32 46,31 Q22,31 6,25 Z"/>' +
            '<path d="M90,23 Q95,15 99,23 Z"/><polygon points="108,23 121,16 117,26 121,35 108,30"/>' +
            '<path d="M30,29 Q24,47 40,49 Q45,40 42,31 Z"/>' +
            '<circle cx="12" cy="24" r="1.6"/><circle cx="18" cy="22.5" r="1.6"/><circle cx="24" cy="21.5" r="1.6"/>',
        rightwhale: '<path d="M6,30 Q10,20 30,18 Q70,15 110,25 Q74,34 34,34 Q12,36 6,30 Z"/>' +
            '<path d="M8,27 Q20,25 34,26 Q22,29 10,30 Z" fill="#ffffff"/>' +
            '<polygon points="108,22 121,15 117,25 121,35 108,29"/><path d="M40,33 Q46,45 54,34 Z"/>' +
            '<circle cx="12" cy="22" r="2"/><circle cx="18" cy="20.5" r="1.6"/>',
        sperm: '<path d="M4,18 Q4,30 10,33 Q30,37 60,32 Q92,29 112,27 Q92,25 60,24 Q34,21 14,18 Q8,16 4,18 Z"/>' +
            '<path d="M78,26 Q82,20 86,26 Z"/><polygon points="110,24 121,18 117,27 121,35 110,31"/>',
        orca: '<path d="M6,27 Q16,23 30,22 Q66,18 110,26 Q66,34 30,32 Q16,31 6,27 Z"/>' +
            '<polygon points="52,22 58,2 70,22"/><polygon points="108,22 121,15 117,25 121,35 108,29"/>' +
            '<path d="M48,31 Q56,46 66,32 Z"/>',
        pilot: '<path d="M6,20 Q8,30 18,31 Q50,35 110,26 Q50,20 20,19 Q10,16 6,20 Z"/>' +
            '<path d="M30,20 Q40,6 50,20 Z"/><polygon points="108,22 121,16 117,25 121,34 108,29"/>' +
            '<path d="M40,30 Q48,43 58,31 Z"/>',
        beaked: '<path d="M4,27 Q12,25 22,24 Q50,20 110,26 Q50,32 22,29 Q12,29 4,27 Z"/>' +
            '<path d="M86,23 Q90,15 95,23 Z"/><polygon points="108,23 121,17 117,26 121,34 108,30"/>',
        turtle: '<ellipse cx="54" cy="28" rx="34" ry="18"/>' +
            '<path d="M20,24 Q10,16 6,24 Q10,30 20,30 Z"/>' +
            '<path d="M34,44 Q30,52 42,48 Z"/><path d="M74,44 Q78,52 66,48 Z"/>' +
            '<path d="M86,22 Q98,16 98,26 Q90,28 84,26 Z"/>',
        unknown: '<path d="M8,27 Q20,22 44,21 Q82,20 110,26 Q82,32 44,31 Q20,31 8,27 Z"/>' +
            '<path d="M62,20 Q68,8 76,20 Z"/><polygon points="108,23 121,16 117,26 121,34 108,30"/>' +
            '<text x="42" y="33" font-size="15" font-weight="bold" fill="#ffffff">?</text>'
    };

    /**
     * Resolve the silhouette key for a species name (English common + scientific
     * typically concatenated). Order matters — more specific terms first.
     * @param {string} name lower-cased species/other name
     * @return {string}
     * @protected
     */
    protected static _key(name: string): string {
        const n = name.toLowerCase();

        if ((/right whale|glattwal|nordkaper|eubalaena/u).test(n)) {
            return 'rightwhale';
        }
        if ((/humpback|buckelwal|megaptera/u).test(n)) {
            return 'humpback';
        }
        if ((/sperm|pottwal|physeter|kogia/u).test(n)) {
            return 'sperm';
        }
        if ((/false killer|pilot|grindwal|globicephala|pseudorca|melon/u).test(n)) {
            return 'pilot';
        }
        if ((/killer whale|orca|schwertwal/u).test(n)) {
            return 'orca';
        }
        if ((/beaked|schnabelwal|ziphius|mesoplodon|hyperoodon|bottlenose whale|entenwal/u).test(n)) {
            return 'beaked';
        }
        if ((/dolphin|delphin|tursiops|stenella|grampus|risso|rundkopf|steno|rauzahn|lagenodelphis|delphinus/u).test(n)) {
            return 'dolphin';
        }
        if ((/turtle|schildkröte|caretta|chelonia|dermochelys|eretmochelys/u).test(n)) {
            return 'turtle';
        }
        if ((/fin whale|finnwal|sei|blue whale|blauwal|minke|mink|bryde|baleen|rorqual|balaenoptera|whale|wal/u).test(n)) {
            return 'rorqual';
        }

        return 'unknown';
    }

    /**
     * Build an inline `<svg>` silhouette for a species, coloured with `color`.
     * @param {string} name species/other name (english + scientific)
     * @param {string} color fill colour (CSS)
     * @param {number} px rendered height in px
     * @return {string} an `<svg>…</svg>` string
     */
    public static svg(name: string, color: string, px: number = 26): string {
        const key = UtilSpeciesSilhouette._key(name);
        const shapes = UtilSpeciesSilhouette._SHAPES[key] ?? UtilSpeciesSilhouette._SHAPES.unknown;
        const width = Math.round((px * 122) / 50);

        return `<svg width="${width}" height="${px}" viewBox="0 0 122 50" fill="${color}" ` +
            `style="vertical-align:middle;flex:0 0 auto;" aria-hidden="true">${shapes}</svg>`;
    }

}