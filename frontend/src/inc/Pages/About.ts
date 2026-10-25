import {
    Card2,
    ContentCol2,
    ContentColSize2,
    ContentRow2,
    LangTextV2
} from 'bambooo';
import {BasePage} from './BasePage';

/**
 * About — project info + third-party credits / attribution (incl. the PhyloPic
 * species silhouettes, which are CC BY-SA 3.0 and therefore require a visible
 * attribution).
 */
export class About extends BasePage {

    /**
     * page name
     * @protected
     */
    protected override _name: string = 'about';

    /**
     * constructor
     */
    public constructor() {
        super();
        this.setTitle(new LangTextV2({text: 'About'}));
    }

    /**
     * loadContent
     */
    public override async loadContent(): Promise<void> {
        const content = this._wrapper.getContentWrapper().getContent();

        const row = new ContentRow2(content.getContentFluidElement());
        const col = new ContentCol2(row, ContentColSize2.colLg8);

        // Project ------------------------------------------------------------------------------
        const cardProject = new Card2({});
        cardProject.appendTo(col.getElement());
        cardProject.setTitle(new LangTextV2({text: 'About MWPA'}));
        cardProject.getBodyElement().append(
            '<p><b>MWPA</b> — Mammal watching. Processing. Analysing.</p>' +
            '<p>A project of the <a href="https://m-e-e-r.de/" target="_blank" rel="noopener">M.e.e.r e.V.</a> ' +
            'association. Source code on ' +
            '<a href="https://github.com/stefanwerfling/mwpa" target="_blank" rel="noopener">GitHub</a>.</p>'
        );

        // Credits ------------------------------------------------------------------------------
        const cardCredits = new Card2({});
        cardCredits.appendTo(col.getElement());
        cardCredits.setTitle(new LangTextV2({text: 'Credits & licenses'}));
        cardCredits.getBodyElement().append(
            '<p><b>Species silhouettes</b> shown on the map and in sighting popovers are from ' +
            '<a href="https://www.phylopic.org/" target="_blank" rel="noopener">PhyloPic</a> ' +
            '(phylopic.org) &mdash; &copy; the respective authors (mostly ' +
            '<a href="https://www.phylopic.org/contributors" target="_blank" rel="noopener">T.&nbsp;Michael&nbsp;Keesey</a>), ' +
            'licensed under ' +
            '<a href="https://creativecommons.org/licenses/by-sa/3.0/" target="_blank" rel="noopener">CC&nbsp;BY-SA&nbsp;3.0</a>, ' +
            'CC0 and Public Domain. The full per-file list is in ' +
            '<code>images/species/ATTRIBUTION.md</code>.</p>' +
            '<p class="text-muted mb-0"><small>Built with AdminLTE 4, Bootstrap 5, OpenLayers, D3/dc.js and the ' +
            '<a href="https://github.com/stefanwerfling/bambooo" target="_blank" rel="noopener">bambooo</a> widget library.</small></p>'
        );
    }

}