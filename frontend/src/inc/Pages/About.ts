import {Lang} from '../Lang';
import {
    Card2,
    CardBodyType2,
    ContentCol2,
    ContentColSize2,
    ContentRow2,
    LangTextV2
} from 'bambooo';
import {BasePage} from './BasePage';

/**
 * A silhouette entry shown in the About page gallery.
 */
type AboutSpecies = {
    slug: string;
    label: string;
};

/**
 * An external data source shown in the About page.
 */
type AboutSource = {
    name: string;
    url: string;
    desc: string;
};

/**
 * A grouped set of external data sources.
 */
type AboutSourceGroup = {
    icon: string;
    title: string;
    items: AboutSource[];
};

/**
 * About — project info + a species-silhouette gallery + third-party credits /
 * attribution (incl. the PhyloPic silhouettes, which are CC BY-SA 3.0 and
 * therefore require a visible attribution).
 */
export class About extends BasePage {

    /**
     * page name
     * @protected
     */
    protected override _name: string = 'about';

    /**
     * Gallery order: dolphins → other toothed whales → baleen whales → turtle.
     * @protected
     */
    protected static readonly _GALLERY: AboutSpecies[] = [
        {slug: 'tursiops-truncatus', label: 'Bottlenose Dolphin'},
        {slug: 'stenella-frontalis', label: 'Atlantic Spotted Dolphin'},
        {slug: 'stenella-coeruleoalba', label: 'Striped Dolphin'},
        {slug: 'delphinus-delphis', label: 'Common Dolphin'},
        {slug: 'steno-bredanensis', label: 'Rough-Toothed Dolphin'},
        {slug: 'lagenodelphis-hosei', label: 'Fraser\'s Dolphin'},
        {slug: 'grampus-griseus', label: 'Risso\'s Dolphin'},
        {slug: 'globicephala', label: 'Pilot Whale'},
        {slug: 'pseudorca-crassidens', label: 'False Killer Whale'},
        {slug: 'orcinus-orca', label: 'Orca'},
        {slug: 'physeter-macrocephalus', label: 'Sperm Whale'},
        {slug: 'kogia-breviceps', label: 'Pygmy Sperm Whale'},
        {slug: 'ziphius-cavirostris', label: 'Cuvier\'s Beaked Whale'},
        {slug: 'mesoplodon-densirostris', label: 'Blainville\'s Beaked Whale'},
        {slug: 'mesoplodon-europaeus', label: 'Gervais\' Beaked Whale'},
        {slug: 'hyperoodon-ampullatus', label: 'Northern Bottlenose Whale'},
        {slug: 'megaptera-novaeangliae', label: 'Humpback Whale'},
        {slug: 'eubalaena-glacialis', label: 'North Atlantic Right Whale'},
        {slug: 'balaenoptera-physalus', label: 'Fin Whale'},
        {slug: 'balaenoptera-borealis', label: 'Sei Whale'},
        {slug: 'balaenoptera-musculus', label: 'Blue Whale'},
        {slug: 'balaenoptera-edeni', label: 'Bryde\'s Whale'},
        {slug: 'balaenoptera-acutorostrata', label: 'Minke Whale'},
        {slug: 'cheloniidae', label: 'Sea Turtle'}
    ];

    /**
     * External data sources the platform integrates, grouped by domain.
     * @protected
     */
    protected static readonly _SOURCES: AboutSourceGroup[] = [
        {
            icon: 'fa-water', title: 'Oceanography & climate', items: [
                {name: 'Copernicus Marine (CMEMS)', url: 'https://marine.copernicus.eu/', desc: 'currents, biogeochemistry'},
                {name: 'NOAA CoastWatch / ERDDAP', url: 'https://coastwatch.pfeg.noaa.gov/erddap/', desc: 'chlorophyll-a, salinity, sea-level anomaly'},
                {name: 'NASA POWER', url: 'https://power.larc.nasa.gov/', desc: 'solar radiation / UV, meteorology'},
                {name: 'Open-Meteo', url: 'https://open-meteo.com/', desc: 'weather & marine weather'},
                {name: 'NOAA CPC / PSL', url: 'https://www.cpc.ncep.noaa.gov/', desc: 'climate indices (NAO, AMO, …)'}
            ]
        },
        {
            icon: 'fa-ruler-vertical', title: 'Bathymetry', items: [
                {name: 'EMODnet Bathymetry', url: 'https://emodnet.ec.europa.eu/en/bathymetry', desc: 'depth grid & map tiles'},
                {name: 'NOAA NGDC ETOPO 2022', url: 'https://www.ncei.noaa.gov/products/etopo-global-relief-model', desc: 'depth (fallback)'}
            ]
        },
        {
            icon: 'fa-bolt', title: 'Seismic', items: [
                {name: 'EMSC SeismicPortal', url: 'https://www.seismicportal.eu/', desc: 'earthquakes'},
                {name: 'USGS Earthquake', url: 'https://earthquake.usgs.gov/', desc: 'earthquakes'}
            ]
        },
        {
            icon: 'fa-ship', title: 'Maritime traffic', items: [
                {name: 'AISStream', url: 'https://aisstream.io/', desc: 'live AIS vessel positions'},
                {name: 'Global Fishing Watch', url: 'https://globalfishingwatch.org/', desc: 'fishing effort'}
            ]
        },
        {
            icon: 'fa-paw', title: 'Taxonomy', items: [
                {name: 'WoRMS', url: 'https://www.marinespecies.org/', desc: 'World Register of Marine Species (AphiaID)'},
                {name: 'Open Tree of Life', url: 'https://tree.opentreeoflife.org/', desc: 'taxonomy / phylogeny'},
                {name: 'OneZoom', url: 'https://www.onezoom.org/', desc: 'tree-of-life explorer'}
            ]
        },
        {
            icon: 'fa-map', title: 'Base maps', items: [
                {name: 'OpenStreetMap', url: 'https://www.openstreetmap.org/', desc: 'base map'},
                {name: 'IDEE / IGN España', url: 'https://www.idee.es/', desc: 'relief tiles'}
            ]
        },
        {
            icon: 'fa-calendar-check', title: 'Tours', items: [
                {name: 'FareHarbor', url: 'https://fareharbor.com/', desc: 'external tour bookings'}
            ]
        }
    ];

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
        const fluid = content.getContentFluidElement();

        // One-time styles for the About page.
        if (jQuery('#mwpa-about-style').length === 0) {
            jQuery(
                '<style id="mwpa-about-style">' +
                '.mwpa-about-hero{text-align:center;padding:30px 16px 10px;}' +
                '.mwpa-about-hero img{height:92px;filter:drop-shadow(0 4px 10px rgba(0,0,0,.15));}' +
                '.mwpa-about-hero h1{margin:14px 0 2px;font-weight:700;letter-spacing:.5px;}' +
                '.mwpa-about-hero .lead{color:#6c757d;font-size:1.05rem;}' +
                '.mwpa-about-hero .sep{width:60px;height:3px;border-radius:3px;background:#0d6efd;margin:14px auto 0;}' +
                '.mwpa-species-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(130px,1fr));gap:10px;}' +
                '.mwpa-species-cell{display:flex;flex-direction:column;align-items:center;justify-content:flex-end;' +
                'text-align:center;padding:12px 6px 8px;border:1px solid #e9ecef;border-radius:.5rem;background:#fff;' +
                'transition:box-shadow .15s ease,transform .15s ease;}' +
                '.mwpa-species-cell:hover{box-shadow:0 4px 14px rgba(0,0,0,.1);transform:translateY(-2px);}' +
                '.mwpa-species-cell img{height:46px;max-width:100%;object-fit:contain;margin-bottom:8px;}' +
                '.mwpa-species-cell .cap{font-size:.74rem;color:#495057;line-height:1.2;}' +
                '.mwpa-sources{display:grid;grid-template-columns:repeat(auto-fill,minmax(270px,1fr));gap:16px 28px;}' +
                '.mwpa-sources h6{font-weight:600;margin-bottom:6px;}' +
                '.mwpa-sources ul{list-style:none;padding-left:0;margin-bottom:0;}' +
                '.mwpa-sources li{font-size:.86rem;margin-bottom:4px;line-height:1.3;}' +
                '.mwpa-sources li .desc{color:#6c757d;}' +
                '</style>'
            ).appendTo('head');
        }

        // Hero ---------------------------------------------------------------------------------
        const heroRow = new ContentRow2(fluid);
        new ContentCol2(heroRow, ContentColSize2.col12).getElement().append(
            '<div class="mwpa-about-hero">'
            + '<img src="images/whale-ico.png" alt="MWPA">'
            + '<h1>MWPA</h1>'
            + `<div class="lead">${Lang.i().l('Mammal Watching · Processing · Analysing')}</div>`
            + '<div class="sep"></div>'
            + '</div>'
        );

        const row = new ContentRow2(fluid);
        const col = new ContentCol2(row, ContentColSize2.colLg10);

        // Project ------------------------------------------------------------------------------
        const cardProject = new Card2({bodyType: CardBodyType2.none});
        cardProject.appendTo(col.getElement());
        cardProject.setTitle(new LangTextV2({text: 'The project'}));
        cardProject.getBodyElement().append(
            `<p class="mb-2"><i class="fas fa-water text-primary me-2"></i>${
                Lang.i().l('A platform to record, process and analyse marine-mammal sightings around the Canary Islands.')}</p>`
            + `<p class="mb-2"><i class="fas fa-people-group text-primary me-2"></i>${
                Lang.i().l('A project of the association:')} <a href="https://m-e-e-r.de/" target="_blank" rel="noopener">M.e.e.r e.V.</a></p>`
            + `<p class="mb-0"><i class="fab fa-github text-primary me-2"></i>${
                Lang.i().l('Open source on')} <a href="https://github.com/stefanwerfling/mwpa" target="_blank" rel="noopener">GitHub</a>.</p>`
        );

        // Data sources -------------------------------------------------------------------------
        const cardSources = new Card2({bodyType: CardBodyType2.none});
        cardSources.appendTo(col.getElement());
        cardSources.setTitle(new LangTextV2({text: 'Data sources'}));

        const groups = About._SOURCES.map((g) =>
            `<div class="src-group"><h6><i class="fas ${g.icon} me-2 text-primary"></i>${Lang.i().l(g.title)}</h6><ul>${
                g.items.map((it) =>
                    `<li><a href="${it.url}" target="_blank" rel="noopener">${it.name}</a> <span class="desc">— ${Lang.i().l(it.desc)}</span></li>`).join('')
            }</ul></div>`).join('');
        cardSources.getBodyElement().append(`<div class="mwpa-sources">${groups}</div>`);

        // Species silhouettes gallery ----------------------------------------------------------
        const cardSpecies = new Card2({bodyType: CardBodyType2.none});
        cardSpecies.appendTo(col.getElement());
        cardSpecies.setTitle(new LangTextV2({text: 'Species silhouettes'}));

        const cells = About._GALLERY.map((s) =>
            '<div class="mwpa-species-cell">' +
            `<img src="images/species/${s.slug}.svg" alt="${Lang.i().l(s.label)}" loading="lazy">` +
            `<div class="cap">${Lang.i().l(s.label)}</div>` +
            '</div>').join('');
        cardSpecies.getBodyElement().append(`<div class="mwpa-species-grid">${cells}</div>`);

        // Credits ------------------------------------------------------------------------------
        const cardCredits = new Card2({bodyType: CardBodyType2.none});
        cardCredits.appendTo(col.getElement());
        cardCredits.setTitle(new LangTextV2({text: 'Credits & licenses'}));
        cardCredits.getBodyElement().append(
            `<p><i class="fas fa-paintbrush text-primary me-2"></i>${
                Lang.i().l('The species silhouettes above (shown on the map and in sighting popovers) are from')} `
            + '<a href="https://www.phylopic.org/" target="_blank" rel="noopener">PhyloPic</a> &mdash; '
            + `${Lang.i().l('© the respective authors (mostly')} `
            + '<a href="https://www.phylopic.org/contributors" target="_blank" rel="noopener">T.&nbsp;Michael&nbsp;Keesey</a>'
            + `${Lang.i().l('), licensed under')} `
            + '<a href="https://creativecommons.org/licenses/by-sa/3.0/" target="_blank" rel="noopener">CC&nbsp;BY-SA&nbsp;3.0</a>'
            + `${Lang.i().l(', CC0 and Public Domain. The full per-file list is in')} <code>images/species/ATTRIBUTION.md</code>.</p>`
            + '<hr>'
            + `<p class="text-muted mb-0"><small>${Lang.i().l('Built with AdminLTE 4, Bootstrap 5, OpenLayers, D3/dc.js and the')} `
            + '<a href="https://github.com/stefanwerfling/bambooo" target="_blank" rel="noopener">bambooo</a>'
            + `${Lang.i().l(' widget library.')}</small></p>`
        );
    }

}