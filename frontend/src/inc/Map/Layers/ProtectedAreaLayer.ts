import {Feature} from 'ol';
import {containsCoordinate} from 'ol/extent';
import {FeatureLike} from 'ol/Feature';
import {GeoJSON} from 'ol/format';
import {Geometry} from 'ol/geom';
import BaseLayer from 'ol/layer/Base';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import {Fill, Stroke, Style, Text} from 'ol/style';
import {Lang} from '../../Lang';
import {MapLayer} from '../MapLayer';

/**
 * Properties of one protected area (see backend Natura2000Sites).
 */
export type ProtectedAreaInfo = {
    code: string;
    name: string;

    /**
     * A = Birds Directive (SPA / ZEPA), B = Habitats Directive (SCI, SAC /
     * LIC, ZEC), C = both.
     */
    site_type: string;
    area_km2: number;
    url: string;
};

/**
 * Natura 2000 sites as outlined, lightly filled polygons — colour by
 * directive, name label from zoom ~11 on. Single areas can be hidden
 * ({@link setAreaVisible}); clicking an area shows name, type, code, size
 * and the link to its EEA standard data form.
 */
export class ProtectedAreaLayer extends MapLayer {

    /**
     * Label from this view resolution (m/px) downwards
     * @protected
     */
    protected static readonly _LABEL_RESOLUTION = 60;

    protected _layer: VectorLayer<VectorSource> | undefined;

    protected _source: VectorSource | undefined;

    /**
     * Codes of hidden areas
     * @protected
     */
    protected _hidden: Set<string> = new Set<string>();

    protected _styles: Map<string, Style> = new Map<string, Style>();

    /**
     * Colour + label of a site type.
     * @param {string} siteType
     * @return {{color: string; label: string; short: string;}}
     */
    public static typeInfo(siteType: string): {color: string; label: string; short: string;} {
        switch (siteType) {
            case 'A':
                return {color: '#1f78b4', label: 'Birds Directive (SPA / ZEPA)', short: 'ZEPA'};

            case 'C':
                return {color: '#7b3fa0', label: 'Habitats + Birds Directive', short: 'ZEC + ZEPA'};

            default:
                return {color: '#2b9348', label: 'Habitats Directive (SCI, SAC / ZEC)', short: 'ZEC'};
        }
    }

    public override getName(): string {
        return 'protected_area_layer';
    }

    public override getTitle(): string {
        return 'Protected areas';
    }

    public override getOlLayer(): BaseLayer {
        if (!this._layer) {
            this._source = new VectorSource();
            this._layer = new VectorLayer({
                source: this._source,
                style: (feature: FeatureLike, resolution: number): Style | undefined => this._styleFor(feature, resolution)
            });
            this._layer.setZIndex(50);
        }

        return this._layer;
    }

    /**
     * Replace the areas from a GeoJSON FeatureCollection string (EPSG:4326).
     * @param {string} geojson
     */
    public setGeoJson(geojson: string): void {
        this.getOlLayer();

        if (!this._source) {
            return;
        }

        const features = new GeoJSON().readFeatures(geojson, {
            dataProjection: 'EPSG:4326',
            featureProjection: 'EPSG:3857'
        }) as Feature<Geometry>[];

        for (const feature of features) {
            feature.set('content', ProtectedAreaLayer._popupHtml(feature.getProperties() as ProtectedAreaInfo));
        }

        this._source.clear(true);
        this._source.addFeatures(features);
        this._styles.clear();
    }

    /**
     * All areas, sorted by name.
     * @return {ProtectedAreaInfo[]}
     */
    public getAreas(): ProtectedAreaInfo[] {
        return (this._source?.getFeatures() ?? [])
        .map((feature) => ProtectedAreaLayer._infoOf(feature))
        .sort((a, b) => a.name.localeCompare(b.name));
    }

    public isAreaVisible(code: string): boolean {
        return !this._hidden.has(code);
    }

    public setAreaVisible(code: string, visible: boolean): void {
        if (visible) {
            this._hidden.delete(code);
        } else {
            this._hidden.add(code);
        }

        this._layer?.changed();
    }

    /**
     * Extent (EPSG:3857) of one area.
     * @param {string} code
     * @return {number[]|undefined}
     */
    public getAreaExtent(code: string): number[] | undefined {
        const feature = this._source?.getFeatures().find((f) => f.get('code') === code);
        return feature?.getGeometry()?.getExtent();
    }

    /**
     * Number of points (EPSG:3857) inside each area.
     * @param {number[][]} points
     * @return {Map<string, number>}
     */
    public countInside(points: number[][]): Map<string, number> {
        const counts = new Map<string, number>();

        for (const feature of this._source?.getFeatures() ?? []) {
            const geometry = feature.getGeometry();

            if (geometry) {
                const extent = geometry.getExtent();
                let count = 0;

                for (const point of points) {
                    if (containsCoordinate(extent, point) && geometry.intersectsCoordinate(point)) {
                        count++;
                    }
                }

                counts.set(`${feature.get('code')}`, count);
            }
        }

        return counts;
    }

    /**
     * Area properties of a feature.
     * @param {FeatureLike} feature
     * @return {ProtectedAreaInfo}
     * @protected
     */
    protected static _infoOf(feature: FeatureLike): ProtectedAreaInfo {
        return {
            code: `${feature.get('code') ?? ''}`,
            name: `${feature.get('name') ?? ''}`,
            site_type: `${feature.get('site_type') ?? ''}`,
            area_km2: Number(feature.get('area_km2')) || 0,
            url: `${feature.get('url') ?? ''}`
        };
    }

    /**
     * Popover HTML of an area.
     * @param {ProtectedAreaInfo} info
     * @return {string}
     * @protected
     */
    protected static _popupHtml(info: ProtectedAreaInfo): string {
        const lang = Lang.i();
        const type = ProtectedAreaLayer.typeInfo(info.site_type);
        const esc = (s: string): string => s
        .replace(/&/gu, '&amp;')
        .replace(/</gu, '&lt;')
        .replace(/>/gu, '&gt;')
        .replace(/"/gu, '&quot;');

        const link = info.url === ''
            ? ''
            : `<div class="mt-2"><a href="${esc(info.url)}" target="_blank" rel="noopener">${esc(lang.l('Standard data form (EEA)'))} ↗</a></div>`;

        return [
            '<div style="min-width:220px;">',
            `<div class="fw-semibold mb-1">${esc(info.name)}</div>`,
            `<span class="badge rounded-pill" style="background:${type.color};">${esc(lang.l(type.label))}</span>`,
            `<div class="small text-body-secondary mt-1">${esc(info.code)} · ${info.area_km2.toLocaleString()} km²</div>`,
            link,
            '</div>'
        ].join('');
    }

    /**
     * Style of an area: outline + light fill in the type colour, name label
     * when zoomed in; hidden areas get no style.
     * @param {FeatureLike} feature
     * @param {number} resolution
     * @return {Style|undefined}
     * @protected
     */
    protected _styleFor(feature: FeatureLike, resolution: number): Style | undefined {
        const info = ProtectedAreaLayer._infoOf(feature);

        if (this._hidden.has(info.code)) {
            return undefined;
        }

        const withLabel = resolution < ProtectedAreaLayer._LABEL_RESOLUTION;
        const key = `${info.code}:${withLabel ? 'l' : ''}`;
        let style = this._styles.get(key);

        if (!style) {
            const color = ProtectedAreaLayer.typeInfo(info.site_type).color;

            style = new Style({
                stroke: new Stroke({color, width: 2, lineDash: info.site_type === 'A' ? [8, 6] : undefined}),
                fill: new Fill({color: `${color}1f`}),
                text: withLabel
                    ? new Text({
                        text: info.name,
                        font: '600 12px system-ui, -apple-system, "Segoe UI", sans-serif',
                        fill: new Fill({color}),
                        stroke: new Stroke({color: 'rgba(255,255,255,0.9)', width: 3}),
                        overflow: true
                    })
                    : undefined,
            });

            this._styles.set(key, style);
        }

        return style;
    }

}