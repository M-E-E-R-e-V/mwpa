import {Card, ContentCol, ContentColSize, ContentRow, LangText} from 'bambooo';
import moment from 'moment';
import Feature from 'ol/Feature';
import {default as OlMap} from 'ol/Map';
import Overlay from 'ol/Overlay';
import View from 'ol/View';
import {LineString, Point} from 'ol/geom';
import TileLayer from 'ol/layer/Tile';
import VectorLayer from 'ol/layer/Vector';
import {fromLonLat} from 'ol/proj';
import OSM from 'ol/source/OSM';
import VectorSource from 'ol/source/Vector';
import CircleStyle from 'ol/style/Circle';
import {Fill, RegularShape, Stroke, Style, Text} from 'ol/style';
import {AisLive as AisLiveAPI, AisLiveVesselEntry, AisVesselTrackPoint} from '../Api/AisLive';
import {BasePage} from './BasePage';

const REFRESH_INTERVAL_MS = 30_000;

/**
 * Canary Islands bounding box — matches the default LiveAisService
 * subscription. Frontend doesn't pass `bbox` so the backend returns
 * everything in the buffer; we just centre the initial view here.
 */
const CANARY_CENTER_LONLAT: [number, number] = [-15.7, 28.3];
const INITIAL_ZOOM = 8;

/**
 * Map an AIS `ship_type` code to a fill colour. Grouping per IMO
 * ITU-R M.1371 classes — close to MarineTraffic's well-known palette
 * so anyone who's seen an AIS map before can read this without a
 * legend.
 */
const colorForShipType = (type: number | null | undefined): string => {
    if (typeof type !== 'number') {
        return '#9e9e9e';   // unknown — grey
    }
    if (type >= 80 && type <= 89) {
        return '#e53935';   // tanker — red
    }
    if (type >= 70 && type <= 79) {
        return '#1e88e5';   // cargo — blue
    }
    if (type === 30) {
        return '#fbc02d';   // fishing — yellow
    }
    if (type >= 60 && type <= 69) {
        return '#8e24aa';   // passenger / ferry — purple
    }
    if (type === 36 || type === 37 || type === 35) {
        return '#43a047';   // sailing / pleasure — green
    }
    if (type === 31 || type === 32 || type === 52) {
        return '#fb8c00';   // tug / pilot — orange
    }
    return '#9e9e9e';
};

const escapeHtml = (s: string): string => s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

/**
 * Live AIS map — full-screen OL map showing every vessel currently
 * in the live_ais_track buffer (1 h freshness window).
 *
 * Triangle marker rotated by COG, colour-coded by AIS ship-type.
 * Click → popup with vessel name / flag / SOG / last-seen relative.
 *
 * Auto-refresh every 30 s; cleared by `unloadContent` so a navigation
 * away stops the polling. Vessels that disappear from the response
 * are removed from the map on the next tick.
 */
export class AisLiveMap extends BasePage {

    public static NAME: string = 'ais-live-map';

    protected override _name: string = AisLiveMap.NAME;

    protected _refreshTimer: ReturnType<typeof setInterval> | null = null;

    protected _map: OlMap | null = null;

    protected _vectorSource: VectorSource | null = null;

    /**
     * Separate VectorSource for the trail overlay so it can be cleared
     * without touching the vessel markers, and so its z-index can sit
     * below the markers (a track shouldn't cover its own ship icon).
     * @protected
     */
    protected _trackSource: VectorSource | null = null;

    /**
     * MMSI of the vessel whose trail is currently rendered, or null
     * when the trail is hidden. Tracks the toggle semantics: clicking
     * the same vessel again hides; clicking a different one swaps.
     * @protected
     */
    protected _selectedMmsi: string | null = null;

    protected _popoverAnchor: HTMLDivElement | null = null;

    protected _popoverOverlay: Overlay | null = null;

    /**
     * Feature lookup by MMSI so the refresh tick can mutate the
     * existing feature in place (geometry, style) rather than
     * removing + re-adding everything — keeps the markers from
     * flickering across refresh cycles.
     */
    protected _featureByMmsi: Map<string, Feature> = new Map();

    public override async loadContent(): Promise<void> {
        const lang = Lang_i();  // simple helper for the title only
        void lang;

        const row1 = new ContentRow(this._wrapper.getContentWrapper().getContent());
        const card = new Card(new ContentCol(row1, ContentColSize.col12));
        card.setTitle(new LangText('Live AIS Map'));

        const mapDiv = jQuery<HTMLDivElement>('<div class="ais-live-map"/>').appendTo(card.getElement());

        // Fit to viewport minus header + AdminLTE chrome. 220 px is
        // the empirical sum of navbar + sidebar headers + card padding
        // — same number SightingMap.ts uses.
        const wHeight = jQuery(window).height() ?? 800;
        mapDiv.css({height: `${Math.max(400, wHeight - 220)}px`});

        // OL setup --------------------------------------------------
        this._vectorSource = new VectorSource();
        this._trackSource = new VectorSource();

        // Trail under markers (z 5 < z 10). The line gets a stroked
        // style per-feature; the dots use a default circle style
        // attached at the layer level so we don't re-allocate per ping.
        const trackLayer = new VectorLayer({
            source: this._trackSource,
            zIndex: 5
        });

        const vesselLayer = new VectorLayer({
            source: this._vectorSource,
            zIndex: 10
        });

        this._map = new OlMap({
            target: mapDiv[0],
            layers: [
                new TileLayer({source: new OSM()}),
                trackLayer,
                vesselLayer
            ],
            view: new View({
                center: fromLonLat(CANARY_CENTER_LONLAT),
                zoom: INITIAL_ZOOM,
                multiWorld: true
            })
        });

        // Popover ---------------------------------------------------
        this._popoverAnchor = jQuery<HTMLDivElement>(
            '<div class="ais-popover" style="position:relative;"/>'
        ).appendTo(mapDiv)[0];

        this._popoverOverlay = new Overlay({
            element: this._popoverAnchor,
            offset: [12, -8],
            positioning: 'bottom-left',
            stopEvent: false
        });
        this._map.addOverlay(this._popoverOverlay);

        this._map.on('click', (evt) => {
            const feature = this._map!.forEachFeatureAtPixel(evt.pixel, (f) => f);
            if (!feature) {
                this._hidePopover();
                this._clearTrack();
                return;
            }

            // Track-point dots carry their own metadata for the popover;
            // detect them first so the click handler doesn't also try
            // to fetch a new track on every dot.
            const point = feature.get('track_point') as AisVesselTrackPoint | undefined;
            if (point) {
                this._showTrackPointPopover(fromLonLat([point.lon, point.lat]), point);
                return;
            }

            const entry = feature.get('entry') as AisLiveVesselEntry | undefined;
            if (!entry) {
                this._hidePopover();
                this._clearTrack();
                return;
            }
            this._showPopover(fromLonLat([entry.lon, entry.lat]), entry);

            // Toggle semantics: same vessel again → hide trail; new
            // vessel → swap.
            if (this._selectedMmsi === entry.mmsi) {
                this._clearTrack();
            } else {
                this._showTrackFor(entry.mmsi).catch(() => undefined);
            }
        });

        // Initial load + auto-refresh -------------------------------
        await this._refresh();

        this._refreshTimer = setInterval(() => {
            this._refresh().catch(() => undefined);
        }, REFRESH_INTERVAL_MS);
    }

    public override unloadContent(): void {
        if (this._refreshTimer !== null) {
            clearInterval(this._refreshTimer);
            this._refreshTimer = null;
        }
        if (this._map) {
            this._map.setTarget(undefined);
            this._map = null;
        }
        this._vectorSource = null;
        this._trackSource = null;
        this._selectedMmsi = null;
        this._featureByMmsi.clear();
        super.unloadContent();
    }

    /**
     * Fetch the last hour of pings for the MMSI and render them as a
     * polyline + per-ping dots. Selection state is updated so a
     * second click on the same vessel toggles the trail off.
     * @protected
     */
    protected async _showTrackFor(mmsi: string): Promise<void> {
        if (!this._trackSource) {
            return;
        }

        let points: AisVesselTrackPoint[];
        try {
            points = await AisLiveAPI.getTrack(mmsi);
        } catch (e) {
            this._toast.fire({icon: 'error', title: (e as Error).message});
            return;
        }

        this._trackSource.clear();
        this._selectedMmsi = mmsi;

        if (points.length === 0) {
            return;
        }

        const coords = points.map((p) => fromLonLat([p.lon, p.lat]));
        const line = new Feature({geometry: new LineString(coords)});
        line.setStyle(new Style({
            stroke: new Stroke({
                color: 'rgba(30, 136, 229, 0.85)',  // blue, matches "cargo" palette
                width: 3
            })
        }));
        this._trackSource.addFeature(line);

        // Dots per ping so the user can click any of them to read its
        // exact time + SOG / COG. The dot for the most recent ping
        // gets a slightly larger radius — visual cue for "the marker
        // sits here right now".
        for (let i = 0; i < points.length; i++) {
            const isLatest = i === points.length - 1;
            const dot = new Feature({geometry: new Point(coords[i])});
            dot.set('track_point', points[i]);
            dot.setStyle(new Style({
                image: new CircleStyle({
                    radius: isLatest ? 5 : 3.5,
                    fill: new Fill({color: 'rgba(30, 136, 229, 1)'}),
                    stroke: new Stroke({color: '#ffffff', width: 1})
                })
            }));
            this._trackSource.addFeature(dot);
        }
    }

    protected _clearTrack(): void {
        if (this._trackSource) {
            this._trackSource.clear();
        }
        this._selectedMmsi = null;
    }

    protected _showTrackPointPopover(coord: number[], point: AisVesselTrackPoint): void {
        if (!this._popoverOverlay || !this._popoverAnchor) {
            return;
        }

        const lines: string[] = [
            '<div class="card card-sm" style="min-width:180px;">',
            '<div class="card-body py-1 px-2 small">',
            `<div><i class="far fa-clock mr-1"></i>${escapeHtml(moment(point.received_at * 1000).format('YYYY-MM-DD HH:mm:ss'))}</div>`
        ];
        if (typeof point.sog === 'number') {
            lines.push(`<div>SOG <b>${point.sog.toFixed(1)} kn</b></div>`);
        }
        if (typeof point.cog === 'number') {
            lines.push(`<div>COG ${point.cog.toFixed(0)}°</div>`);
        }
        lines.push('</div></div>');

        this._popoverAnchor.innerHTML = lines.join('');
        this._popoverOverlay.setPosition(coord);
    }

    /**
     * Pull the latest vessels and reconcile against the existing
     * features: update in place when the MMSI is already on the map,
     * add when new, remove when missing.
     * @private
     */
    protected async _refresh(): Promise<void> {
        if (!this._vectorSource) {
            return;
        }

        let vessels: AisLiveVesselEntry[];
        try {
            vessels = await AisLiveAPI.getList();
        } catch (e) {
            this._toast.fire({icon: 'error', title: (e as Error).message});
            return;
        }

        const seen = new Set<string>();

        for (const entry of vessels) {
            seen.add(entry.mmsi);
            let feature = this._featureByMmsi.get(entry.mmsi);

            if (!feature) {
                feature = new Feature({
                    geometry: new Point(fromLonLat([entry.lon, entry.lat]))
                });
                feature.setId(entry.mmsi);
                this._vectorSource.addFeature(feature);
                this._featureByMmsi.set(entry.mmsi, feature);
            } else {
                (feature.getGeometry() as Point).setCoordinates(fromLonLat([entry.lon, entry.lat]));
            }

            feature.set('entry', entry);
            feature.setStyle(AisLiveMap._styleFor(entry));
        }

        // Remove markers for MMSIs that no longer have a fresh ping.
        for (const [mmsi, feature] of this._featureByMmsi.entries()) {
            if (!seen.has(mmsi)) {
                this._vectorSource.removeFeature(feature);
                this._featureByMmsi.delete(mmsi);
            }
        }
    }

    /**
     * Triangle marker rotated by COG. When COG is unknown (anchored
     * vessel) we draw a small circle instead of a directional arrow
     * — wouldn't make sense to point at 0°.
     */
    protected static _styleFor(entry: AisLiveVesselEntry): Style {
        const color = colorForShipType(entry.ship_type);
        const hasCog = typeof entry.cog === 'number';

        const shape = hasCog
            ? new RegularShape({
                points: 3,
                radius: 9,
                rotation: ((entry.cog ?? 0) * Math.PI) / 180,
                fill: new Fill({color}),
                stroke: new Stroke({color: '#ffffff', width: 1.5})
            })
            : new RegularShape({
                points: 12,
                radius: 5,
                fill: new Fill({color}),
                stroke: new Stroke({color: '#ffffff', width: 1.5})
            });

        const labelText = entry.name && entry.name !== '' ? entry.name : entry.mmsi;

        return new Style({
            image: shape,
            text: new Text({
                text: labelText,
                font: '10px sans-serif',
                offsetY: 14,
                fill: new Fill({color: '#222222'}),
                stroke: new Stroke({color: 'rgba(255,255,255,0.85)', width: 3}),
                overflow: true
            })
        });
    }

    protected _showPopover(coord: number[], entry: AisLiveVesselEntry): void {
        if (!this._popoverOverlay || !this._popoverAnchor) {
            return;
        }

        const name = entry.name && entry.name !== '' ? entry.name : `MMSI ${entry.mmsi}`;
        const lines: string[] = [
            `<div class="card card-sm" style="min-width:220px;max-width:300px;">`,
            `<div class="card-header py-1 px-2 small font-weight-bold">${escapeHtml(name)}</div>`,
            `<div class="card-body py-1 px-2 small">`,
            `<div>MMSI <code>${escapeHtml(entry.mmsi)}</code></div>`
        ];
        if (entry.flag) {
            lines.push(`<div>Flag <b>${escapeHtml(entry.flag)}</b></div>`);
        }
        if (typeof entry.ship_type === 'number') {
            lines.push(`<div>Ship-type code <code>${entry.ship_type}</code></div>`);
        }
        if (typeof entry.sog === 'number') {
            lines.push(`<div>SOG <b>${entry.sog.toFixed(1)} kn</b></div>`);
        }
        if (typeof entry.cog === 'number') {
            lines.push(`<div>COG ${entry.cog.toFixed(0)}°</div>`);
        }
        lines.push(`<div class="text-muted">last seen ${escapeHtml(moment(entry.received_at * 1000).fromNow())}</div>`);
        lines.push('</div></div>');

        this._popoverAnchor.innerHTML = lines.join('');
        this._popoverOverlay.setPosition(coord);
    }

    protected _hidePopover(): void {
        if (this._popoverOverlay) {
            this._popoverOverlay.setPosition(undefined);
        }
    }

}

/** Tiny helper so we don't need to import Lang for a single use. */
function Lang_i(): undefined {
    return undefined;
}