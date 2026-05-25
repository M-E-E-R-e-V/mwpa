import {
    Card,
    ContentCol,
    ContentColSize,
    ContentRow,
    LangText,
    LeftNavbarLink
} from 'bambooo';
import moment from 'moment';
import {fromLonLat} from 'ol/proj';
import {
    Earthquake as EarthquakeAPI,
    EarthquakeEntry,
    EarthquakeFilter
} from '../Api/Earthquake';
import {Lang} from '../Lang';
import {BaseMap} from '../Map/BaseMap';
import {EarthquakeLayer} from '../Map/Layers/EarthquakeLayer';
import {OsmBaseLayer} from '../Map/Layers/OsmBaseLayer';
import {BasePage} from './BasePage';

/**
 * Earthquake admin page — list of imported events with a period +
 * min-magnitude filter, a manual "import now" button, and an inline
 * mini-map showing every visible event. Data source is purely the
 * `earthquake` table; the cron job (EarthquakeService) is the only
 * thing that talks to USGS.
 */
export class Earthquake extends BasePage {

    public static NAME: string = 'earthquakes';

    protected override _name: string = Earthquake.NAME;

    /**
     * Filter controls — kept on the instance so the import button can
     * re-read them after a successful run. Raw jQuery refs because the
     * bambooo widgets don't accept loose div parents and dragging in
     * FormRow/FormGroup just for three inputs isn't worth it.
     */
    protected _periodFrom: JQuery<HTMLInputElement> | null = null;
    protected _periodTo: JQuery<HTMLInputElement> | null = null;
    protected _minMag: JQuery<HTMLInputElement> | null = null;

    /**
     * Mini-map handle; disposed in unloadContent.
     */
    protected _map: BaseMap | null = null;
    protected _layer: EarthquakeLayer | null = null;

    public override async unloadContent(): Promise<void> {
        if (this._map) {
            this._map.unload();
            this._map = null;
        }
        this._layer = null;
    }

    public override async loadContent(): Promise<void> {
        const lang = Lang.i();
        const contentWrapper = this._wrapper.getContentWrapper().getContent();

        // Filter card --------------------------------------------------------------------------------------------

        const rowFilter = new ContentRow(contentWrapper);
        const filterCard = new Card(new ContentCol(rowFilter, ContentColSize.col12));
        filterCard.setTitle(new LangText('Earthquakes'));

        const filterBody = jQuery('<div class="card-body d-flex flex-wrap align-items-end" style="gap: 1rem;"/>').appendTo(filterCard.getBodyElement());

        const buildField = (label: string, type: 'date' | 'number'): JQuery<HTMLInputElement> => {
            const wrap = jQuery('<div/>').appendTo(filterBody);
            jQuery(`<div class="text-muted small">${label}</div>`).appendTo(wrap);
            return jQuery<HTMLInputElement>(`<input type="${type}" class="form-control form-control-sm" style="width: 12rem;">`).appendTo(wrap);
        };

        this._periodFrom = buildField(lang.l('Period from'), 'date');
        this._periodTo = buildField(lang.l('Period to'), 'date');
        this._minMag = buildField(lang.l('Min magnitude'), 'number');
        this._minMag.attr('placeholder', '2.5').attr('step', '0.1');

        const btnApply = jQuery<HTMLButtonElement>(
            `<button type="button" class="btn btn-sm btn-primary"><i class="fa fa-filter"></i> ${lang.l('Apply')}</button>`
        ).appendTo(filterBody);
        btnApply.on('click', async() => {
            await this._reload();
        });

        const btnImport = jQuery<HTMLButtonElement>(
            `<button type="button" class="btn btn-sm btn-default"><i class="fa fa-download"></i> ${lang.l('Import now')}</button>`
        ).appendTo(filterBody);
        btnImport.on('click', async() => {
            btnImport.attr('disabled', 'disabled');
            try {
                const res = await EarthquakeAPI.runImport();
                if (res && res.imported !== undefined) {
                    this._toast.fire({
                        icon: 'success',
                        title: `${lang.l('Import done')}: +${res.imported} / ~${res.updated} / sighting-seismic ${res.correlations}`
                    });
                } else if (res?.msg) {
                    this._toast.fire({icon: 'error', title: res.msg});
                }
            } catch (e) {
                this._toast.fire({icon: 'error', title: (e as Error).message});
            } finally {
                btnImport.removeAttr('disabled');
                await this._reload();
            }
        });

        // Map card -----------------------------------------------------------------------------------------------

        const rowMap = new ContentRow(contentWrapper);
        const mapCard = new Card(new ContentCol(rowMap, ContentColSize.col12));
        mapCard.setTitle(new LangText('Map'));
        this._map = new BaseMap(mapCard.getBodyElement());
        this._map.setHeight(360);
        this._map.load({initialCenterLonLat: [-16, 28], initialZoom: 6});
        this._map.addLayer(new OsmBaseLayer());
        this._layer = new EarthquakeLayer();
        this._map.addLayer(this._layer);

        // Table card ---------------------------------------------------------------------------------------------

        const rowTable = new ContentRow(contentWrapper);
        const tableCard = new Card(new ContentCol(rowTable, ContentColSize.col12));
        tableCard.setTitle(new LangText('Events'));

        const tableHost = jQuery<HTMLDivElement>('<div class="card-body p-0" style="max-height: 480px; overflow-y: auto;"/>').appendTo(tableCard.getBodyElement());
        const table = jQuery<HTMLTableElement>('<table class="table table-sm table-striped mb-0"/>').appendTo(tableHost);
        table.append(
            '<thead><tr>' +
            `<th>${lang.l('When')}</th>` +
            `<th class="text-right">${lang.l('Mag')}</th>` +
            `<th class="text-right">${lang.l('Depth (km)')}</th>` +
            `<th>${lang.l('Place')}</th>` +
            `<th class="text-right">${lang.l('Lat')}</th>` +
            `<th class="text-right">${lang.l('Lon')}</th>` +
            `<th>${lang.l('Source')}</th>` +
            '</tr></thead>'
        );
        const tbody = jQuery<HTMLTableSectionElement>('<tbody/>').appendTo(table);

        this._onLoadTable = async(): Promise<void> => {
            tableCard.showLoading();
            try {
                const fromVal = (this._periodFrom?.val() as string) ?? '';
                const toVal = (this._periodTo?.val() as string) ?? '';
                const magVal = (this._minMag?.val() as string) ?? '';
                const filter: EarthquakeFilter = {
                    period_from: fromVal || undefined,
                    period_to: toVal || undefined,
                    min_magnitude: magVal ? parseFloat(magVal) : undefined,
                    limit: 500,
                    offset: 0
                };
                const res = await EarthquakeAPI.getList(filter);
                tbody.empty();

                const list: EarthquakeEntry[] = res?.list ?? [];
                tableCard.setTitle(new LangText(`${lang.l('Events')} (${list.length}${res?.count !== undefined && res.count > list.length ? `/${res.count}` : ''})`));

                if (this._layer && this._map) {
                    this._layer.setEarthquakes(list);
                    this._layer.refresh();
                    if (list.length > 0) {
                        const avgLon = list.reduce((s, e) => s + e.lon, 0) / list.length;
                        const avgLat = list.reduce((s, e) => s + e.lat, 0) / list.length;
                        this._map.setView(fromLonLat([avgLon, avgLat]));
                    }
                }

                const escape = (s: string): string => s.replace(/[&<>"']/g, (ch) =>
                    ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', '\'': '&#39;'})[ch] ?? ch);

                for (const e of list) {
                    const when = moment(e.event_time_ms).format('YYYY-MM-DD HH:mm');
                    const depth = e.depth_km === undefined || e.depth_km === null ? '–' : e.depth_km.toFixed(1);
                    const placeCell = e.url
                        ? `<a href="${escape(e.url)}" target="_blank" rel="noopener noreferrer">${escape(e.place)}</a>`
                        : escape(e.place);
                    tbody.append(
                        '<tr>' +
                        `<td>${when}</td>` +
                        `<td class="text-right"><b>${e.magnitude.toFixed(1)}</b> ${escape(e.magnitude_type)}</td>` +
                        `<td class="text-right">${depth}</td>` +
                        `<td>${placeCell}</td>` +
                        `<td class="text-right">${e.lat.toFixed(3)}</td>` +
                        `<td class="text-right">${e.lon.toFixed(3)}</td>` +
                        `<td>${escape(e.source)}</td>` +
                        '</tr>'
                    );
                }
                Lang.i().lAll();
            } finally {
                tableCard.hideLoading();
            }
        };

        // eslint-disable-next-line no-new
        new LeftNavbarLink(this._wrapper.getNavbar().getLeftNavbar(), 'Reload', async() => {
            await this._reload();
            return false;
        }, 'btn btn-block btn-default btn-sm', 'fa fa-redo');

        await this._reload();
    }

    private async _reload(): Promise<void> {
        if (this._onLoadTable) {
            await this._onLoadTable();
        }
    }

}