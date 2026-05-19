import {Card, ContentCol, ContentColSize, ContentRow, LangText, SelectBottemBorderOnly2} from 'bambooo';
import {Coordinate} from 'ol/coordinate';
import {fromLonLat} from 'ol/proj';
import {Organization as OrganizationAPI} from '../Api/Organization';
import {Sightings as SightingsApi} from '../Api/Sightings';
import {SightingEnvironment, SightingEnvironmentEntry} from '../Api/SightingEnvironment';
import {User as UserAPI} from '../Api/User';
import {BaseMap} from '../Map/BaseMap';
import {AirTemperatureMetricLayer} from '../Map/Layers/AirTemperatureMetricLayer';
import {BathymetryLayer} from '../Map/Layers/BathymetryLayer';
import {ChlorophyllMetricLayer} from '../Map/Layers/ChlorophyllMetricLayer';
import {FishingEffortMetricLayer} from '../Map/Layers/FishingEffortMetricLayer';
import {IdeeEsLayer} from '../Map/Layers/IdeeEsLayer';
import {MetricLayer, MetricPoint} from '../Map/Layers/MetricLayer';
import {OceanCurrentsLayer} from '../Map/Layers/OceanCurrentsLayer';
import {OsmBaseLayer} from '../Map/Layers/OsmBaseLayer';
import {SeaSurfaceTemperatureMetricLayer} from '../Map/Layers/SeaSurfaceTemperatureMetricLayer';
import {WaveHeightMetricLayer} from '../Map/Layers/WaveHeightMetricLayer';
import {MetricCharts} from '../Map/Widgets/MetricCharts';
import {ProvenanceLegend} from '../Map/Widgets/ProvenanceLegend';
import {BasePage} from './BasePage';

/**
 * Ocean & Fishing-effort map page.
 *
 * Renders the sighting set on top of OSM/EMODnet/IDEE base layers,
 * with two interchangeable metric overlays:
 *   - {@link ChlorophyllMetricLayer} — primary productivity proxy
 *     (NOAA CoastWatch ERDDAP, chl-a).
 *   - {@link FishingEffortMetricLayer} — commercial fishing pressure
 *     (Global Fishing Watch, 25 km radius).
 *
 * Both layers are added to the LayerSwitcher; the user opts in by
 * checking the matching entry. The right-side {@link ProvenanceLegend}
 * lists every data source the page draws from, and the bottom row
 * shows {@link MetricCharts} (histogram + scatter + monthly mean) over
 * the loaded sighting set.
 */
export class OceanFishingMap extends BasePage {

    /**
     * @protected
     */
    protected override _name: string = 'ocean_fishing_map';

    /**
     * @protected
     */
    protected _map: BaseMap | null = null;

    /**
     * Metric layers in the order they appear in the LayerSwitcher.
     * The list also feeds the ProvenanceLegend and the per-layer
     * point updates in {@link _reload}, so adding a new metric layer
     * is a single line + accessor.
     * @protected
     */
    protected _metricLayers: {
        layer: MetricLayer;
        accessor: (r: SightingEnvironmentEntry) => number | null | undefined;
    }[] = [];

    /**
     * @protected
     */
    protected _legend: ProvenanceLegend | null = null;

    /**
     * @protected
     */
    protected _charts: MetricCharts | null = null;

    /**
     * Selected year as a 4-digit string, or '' for "all sightings".
     * @protected
     */
    protected _selectedYear: string = '';

    /**
     * Two stored heights for the toggle button: "big" uses (almost) the
     * full viewport so the operator can pan/zoom comfortably, "small"
     * gives the chart row room to fit on the same screen. Values are
     * computed once during loadContent and re-used by {@link _applyMapHeight}.
     * @protected
     */
    protected _mapBigHeight: number = 600;

    /**
     * @protected
     */
    protected _mapSmallHeight: number = 360;

    /**
     * @protected
     */
    protected _mapIsBig: boolean = true;

    public override async unloadContent(): Promise<void> {
        if (this._map) {
            this._map.disposePopover(true);
            this._map.unload();
            this._map = null;
        }
        this._metricLayers = [];
        this._legend = null;
        this._charts = null;
        this._selectedYear = '';
    }

    public override async loadContent(): Promise<void> {
        const row1 = new ContentRow(this._wrapper.getContentWrapper().getContent());
        const card = new Card(new ContentCol(row1, ContentColSize.col12));
        card.setTitle(new LangText('Ocean & Fishing'));

        /*
         * Filter bar on top of the card body: year picker + map-size toggle.
         * Kept slim so the map still gets most of the vertical space.
         */
        const filterBar = jQuery('<div style="display:flex;align-items:center;gap:12px;margin-bottom:8px;"/>').appendTo(card.getBodyElement());
        jQuery('<label style="margin:0;font-weight:600;font-size:0.9rem;">Year</label>').appendTo(filterBar);
        const yearWrap = jQuery('<div style="min-width:200px;"/>').appendTo(filterBar);
        const yearSelect = new SelectBottemBorderOnly2(yearWrap);
        yearSelect.setValues([{key: '', value: '— All sightings —'}]);
        yearSelect.setSelectedValue('');
        yearSelect.setChangeFn((value: string) => {
            this._selectedYear = value;
            void this._reload();
        });

        // Populate year list async — keep the UI usable in the meantime.
        SightingsApi.getYears().then((years) => {
            for (const y of years) {
                yearSelect.addValue({key: `${y}`, value: `${y}`});
            }
        }).catch(() => null);

        // Map-size toggle: collapse the map down so the chart row fits on
        // the same screen, expand it back up for navigation.
        const mapToggleBtn = jQuery(
            '<button type="button" class="btn btn-default btn-sm" title="Shrink / enlarge map" style="margin-left:auto;">'
            + '<i class="fa fa-compress-arrows-alt"/> <span class="map-toggle-label">Shrink map</span>'
            + '</button>'
        ).appendTo(filterBar);
        mapToggleBtn.on('click', () => {
            this._mapIsBig = !this._mapIsBig;
            this._applyMapHeight();
            mapToggleBtn.find('.fa').attr('class', this._mapIsBig ? 'fa fa-compress-arrows-alt' : 'fa fa-expand-arrows-alt');
            mapToggleBtn.find('.map-toggle-label').text(this._mapIsBig ? 'Shrink map' : 'Enlarge map');
        });

        /*
         * Two-column layout inside the card body: map on the left,
         * legend on the right. Done as raw flex because bambooo's
         * ContentCol API works at row scope only.
         */
        const flex = jQuery('<div style="display:flex;gap:12px;"/>').appendTo(card.getBodyElement());
        const mapWrap = jQuery('<div style="flex:1;min-width:0;"/>').appendTo(flex);
        const sideWrap = jQuery('<div style="width:280px;flex-shrink:0;"/>').appendTo(flex);

        this._map = new BaseMap(mapWrap);

        const wHeight = jQuery(window).height();
        if (wHeight) {
            // "Big": map gets almost the whole viewport — charts scroll below the fold.
            // "Small": chart grid fits on the same screen as the map.
            const chromeReserve = 80 + 60 + 50; // navbar + page header + filter bar
            this._mapBigHeight = Math.max(420, wHeight - chromeReserve - 120);
            this._mapSmallHeight = Math.max(320, wHeight - chromeReserve - 760);
        }
        this._applyMapHeight();

        /*
         * Center on the user's organization when known; falls back to
         * BaseMap's default (Canary Islands) otherwise.
         */
        const currentuser = await UserAPI.getUserInfo();
        let initialCenter: [number, number] | undefined;
        if (currentuser?.organization) {
            initialCenter = [
                parseFloat(currentuser.organization.lon),
                parseFloat(currentuser.organization.lat)
            ];
        }

        this._map.load({
            initialCenterLonLat: initialCenter ?? [-17.3340221, 28.0525008],
            initialZoom: 8
        });

        // Base + overlay layers ----------------------------------------------------------------
        this._map.addLayer(new OsmBaseLayer());
        this._map.addLayer(new IdeeEsLayer());
        this._map.addLayer(new BathymetryLayer());
        this._map.addLayer(new OceanCurrentsLayer());

        /*
         * Metric layers — each registered separately so the
         * LayerSwitcher offers them as independent toggles. The user
         * picks one (or stacks several, they overlay). Adding a new
         * metric here only requires the layer class + an accessor
         * pulling the value off SightingEnvironmentEntry.
         */
        this._metricLayers = [
            {layer: new ChlorophyllMetricLayer(), accessor: (r): number | null | undefined => r.chl_a_mg_m3_day},
            {layer: new FishingEffortMetricLayer(), accessor: (r): number | null | undefined => r.fishing_hours_day_25km},
            {layer: new SeaSurfaceTemperatureMetricLayer(), accessor: (r): number | null | undefined => r.sst_c_day},
            {layer: new AirTemperatureMetricLayer(), accessor: (r): number | null | undefined => r.air_temperature_c_day},
            {layer: new WaveHeightMetricLayer(), accessor: (r): number | null | undefined => r.wave_height_m_day}
        ];

        for (const {layer} of this._metricLayers) {
            this._map.addLayer(layer);
        }

        // Recenter on org once the map is loaded.
        if (currentuser?.organization) {
            const center: Coordinate = fromLonLat([
                parseFloat(currentuser.organization.lon),
                parseFloat(currentuser.organization.lat)
            ]);
            this._map.setView(center, 8);
        }

        // Side panel: provenance legend -------------------------------------------------------
        this._legend = new ProvenanceLegend(sideWrap);
        this._legend.setStaticEntries([
            {label: 'OSM tiles', source: 'OpenStreetMap (local cache)', url: 'https://www.openstreetmap.org/'},
            {label: 'Bathymetry', source: 'EMODnet Bathymetry WMS', url: 'https://emodnet.ec.europa.eu/en/bathymetry'},
            {label: 'Relief (ES)', source: 'IDEE / IGN España (local cache)', url: 'https://www.idee.es/'},
            {label: 'Weather + waves', source: 'Open-Meteo marine + forecast API', url: 'https://open-meteo.com/'},
            {label: 'Sea depth', source: 'EMODnet Bathymetry point lookup', url: 'https://emodnet.ec.europa.eu/en/bathymetry'},
            {label: 'Ocean currents', source: 'NASA GIBS WMS — OSCAR Final, ⅓°', url: 'https://podaac.jpl.nasa.gov/dataset/OSCAR_L4_OC_FINAL_V2.0'}
        ]);
        this._legend.setMetricLayers(this._metricLayers.map(({layer}) => layer));

        // Charts row (bottom of card body) ----------------------------------------------------
        const chartsRow = jQuery('<div style="margin-top:12px;"/>').appendTo(card.getBodyElement());
        this._charts = new MetricCharts(chartsRow);

        /*
         * Try to look up org for the additional org-context lookup so
         * the lazy import isn't dropped by the bundler (and so future
         * org-scope helpers have one in hand).
         */
        if (currentuser?.organization) {
            await OrganizationAPI.getOrganization(currentuser.organization.id).catch(() => null);
        }

        // Initial data load — no filter, default backend pagination.
        await this._reload();
    }

    /**
     * Push the currently selected height to the map element and trigger
     * an OL `updateSize` so tiles/layers re-fit immediately. No-op when
     * the map hasn't been instantiated yet.
     * @protected
     */
    protected _applyMapHeight(): void {
        if (!this._map) {
            return;
        }
        const height = this._mapIsBig ? this._mapBigHeight : this._mapSmallHeight;
        this._map.setHeight(height);
        this._map.updateSize();
    }

    /**
     * Fetch the environment list and feed every dependent widget.
     * Honours the year selector — empty year means "all sightings".
     * @protected
     */
    protected async _reload(): Promise<void> {
        const filter: {limit: number; offset: number; period_from?: string; period_to?: string;} = {
            limit: 5000,
            offset: 0
        };

        if (this._selectedYear !== '' && /^\d{4}$/.test(this._selectedYear)) {
            filter.period_from = `${this._selectedYear}-01-01`;
            filter.period_to = `${this._selectedYear}-12-31`;
        }

        const response = await SightingEnvironment.getList(filter);

        if (!response) {
            return;
        }

        const rows = response.list;

        for (const {layer, accessor} of this._metricLayers) {
            const points: MetricPoint[] = rows.map((r) => ({
                id: r.id,
                lon: r.lon,
                lat: r.lat,
                value: accessor(r) ?? null,
                content: OceanFishingMap._buildTooltip(r)
            }));
            layer.setPoints(points);
            layer.refresh();
        }

        if (this._charts) {
            this._charts.setData(rows);
        }
    }

    /**
     * @protected
     */
    protected static _buildTooltip(r: SightingEnvironmentEntry): string {
        const fmt = (n: number | undefined, digits: number, suffix: string): string =>
            typeof n === 'number' && Number.isFinite(n) ? `${n.toFixed(digits)} ${suffix}` : '—';

        const rows = [
            `<b>Sighting #${r.id}</b>`,
            r.species_name ? `Species: ${r.species_name}` : null,
            r.date ? `Date: ${r.date}` : null,
            '<i>— Ocean —</i>',
            `Chl-a: ${fmt(r.chl_a_mg_m3_day, 2, 'mg/m³')}`,
            `Salinity: ${fmt(r.salinity_psu_day, 2, 'PSU')}`,
            `SST: ${fmt(r.sst_c_day, 1, '°C')}`,
            `Current: ${fmt(r.current_speed_m_s_day, 2, 'm/s')}`,
            `Depth: ${fmt(r.depth_m, 0, 'm')}`,
            '<i>— Weather —</i>',
            `Air temp: ${fmt(r.air_temperature_c_day, 1, '°C')}`,
            `Wave height: ${fmt(r.wave_height_m_day, 2, 'm')}`,
            `Wave period: ${fmt(r.wave_period_s_day, 1, 's')}`,
            r.uv_index_day === undefined ? null : `UV index: ${fmt(r.uv_index_day, 1, '')}`,
            '<i>— Fishing —</i>',
            `Fishing (25 km): ${fmt(r.fishing_hours_day_25km, 1, 'h/day')}`,
            `Vessels (25 km): ${typeof r.vessel_count_day_25km === 'number' ? r.vessel_count_day_25km : '—'}`,
            r.top_gear_type ? `Top gear: ${r.top_gear_type}` : null,
            r.top_flag ? `Top flag: ${r.top_flag}` : null
        ];

        return rows.filter((row): row is string => row !== null).join('<br>');
    }

}