/**
 * Species silhouettes shown in the map sighting popover.
 *
 * The images are individual SVG files under `images/species/` — professional,
 * detailed silhouettes from PhyloPic (phylopic.org, mostly CC BY-SA 3.0; see
 * `images/species/ATTRIBUTION.md`). Each sighting species is matched to the best
 * file by keywords in its name (scientific or common), which is robust across
 * databases where the numeric species ids differ.
 */
export class UtilSpeciesSilhouette {

    /**
     * Ordered keyword → silhouette-file mapping. More specific entries first
     * (e.g. the individual `Balaenoptera` species before the generic baleen
     * fallback, `false killer` before `killer whale`). Matched against the
     * lower-cased species/other name.
     * @protected
     */
    protected static readonly _RULES: [RegExp, string][] = [
        [/stenella frontalis|atlantic spotted/u, 'stenella-frontalis'],
        [/stenella coeruleoalb|striped dolphin|streifendelph/u, 'stenella-coeruleoalba'],
        [/tursiops|bottlenose dolphin|grosser tümmler|großer tümmler/u, 'tursiops-truncatus'],
        [/delphinus|common dolphin|gewöhnlicher delph/u, 'delphinus-delphis'],
        [/pseudorca|false killer|kleiner schwertwal/u, 'pseudorca-crassidens'],
        [/globicephala|pilot whale|grindwal/u, 'globicephala'],
        [/orcinus|killer whale|\borca\b|schwertwal/u, 'orcinus-orca'],
        [/grampus|risso|rundkopfdelph/u, 'grampus-griseus'],
        [/steno |rough-toothed|rauzahn/u, 'steno-bredanensis'],
        [/lagenodelphis|fraser/u, 'lagenodelphis-hosei'],
        [/kogia|pygmy sperm|zwergpottwal/u, 'kogia-breviceps'],
        [/physeter|sperm whale|pottwal/u, 'physeter-macrocephalus'],
        [/ziphius|cuvier/u, 'ziphius-cavirostris'],
        [/mesoplodon europaeus|gervais/u, 'mesoplodon-europaeus'],
        [/mesoplodon|blainville|dense beaked/u, 'mesoplodon-densirostris'],
        [/hyperoodon|northern bottlenose|entenwal/u, 'hyperoodon-ampullatus'],
        [/beaked|schnabelwal|ziphiidae/u, 'ziphiidae'],
        [/megaptera|humpback|buckelwal/u, 'megaptera-novaeangliae'],
        [/eubalaena|right whale|glattwal|nordkaper/u, 'eubalaena-glacialis'],
        [/balaenoptera physalus|fin whale|finnwal/u, 'balaenoptera-physalus'],
        [/balaenoptera borealis|sei whale|seiwal/u, 'balaenoptera-borealis'],
        [/balaenoptera musculus|blue whale|blauwal/u, 'balaenoptera-musculus'],
        [/balaenoptera edeni|bryde/u, 'balaenoptera-edeni'],
        [/balaenoptera acutorostrata|minke|mink/u, 'balaenoptera-acutorostrata'],
        [/baleen|mysticeti|balaenoptera|bartenwal/u, 'mysticeti'],
        [/turtle|schildkröte|caretta|chelonia|dermochelys|eretmochelys/u, 'cheloniidae']
    ];

    /**
     * Resolve the silhouette file slug for a species name.
     * @param {string} name species/other name (common + scientific)
     * @return {string}
     * @protected
     */
    protected static _slug(name: string): string {
        const n = name.toLowerCase();

        for (const [rule, slug] of UtilSpeciesSilhouette._RULES) {
            if (rule.test(n)) {
                return slug;
            }
        }

        return 'cetacea';
    }

    /**
     * Build an `<img>` tag for a species silhouette (served from
     * `images/species/<slug>.svg`).
     * @param {string} name species/other name (common + scientific)
     * @param {number} px rendered height in px
     * @return {string} an `<img …>` string
     */
    public static img(name: string, px: number = 48): string {
        const slug = UtilSpeciesSilhouette._slug(name);

        return `<img src="images/species/${slug}.svg" alt="" aria-hidden="true" ` +
            `style="height:${px}px;max-width:100%;display:block;object-fit:contain;"/>`;
    }

}