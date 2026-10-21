import {FeatureLike} from 'ol/Feature';
import {GeoJSON} from 'ol/format';
import BaseLayer from 'ol/layer/Base';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import {Fill, Stroke, Style} from 'ol/style';
import {MapLayer} from '../MapLayer';

/**
 * One grid cell from the species profile's spatial analysis.
 */
export type SpatialGridCell = {
    lon: number;
    lat: number;
    ud_level: number;
    gi_z?: number;
};

/**
 * Render mode: the utilisation-distribution isopleths, or the Getis-Ord Gi*
 * hotspot z-scores.
 */
export type SpatialGridMode = 'ud' | 'gi';

/**
 * Vector layer that paints the server-computed spatial grid (KDE utilisation
 * distribution + Getis-Ord Gi* hotspots) as filled lon/lat rectangles. Each
 * cell is drawn as a rectangle `cellLonDeg × cellLatDeg` centred on its
 * coordinate; the fill depends on {@link SpatialGridMode}:
 *
 *   - `ud`: 50 % core and 95 % home-range isopleths (two shades).
 *   - `gi`: diverging red/blue ramp over the Gi* z-score (|z| ≥ 1.96 / 2.58).
 */
export class SpatialGridLayer extends MapLayer {

    /**
     * @protected
     */
    protected _layer: VectorLayer<VectorSource> | undefined;

    /**
     * @protected
     */
    protected _source: VectorSource | undefined;

    /**
     * @protected
     */
    protected _cells: SpatialGridCell[] = [];

    /**
     * @protected
     */
    protected _cellLonDeg: number = 0.1;

    /**
     * @protected
     */
    protected _cellLatDeg: number = 0.1;

    /**
     * @protected
     */
    protected _mode: SpatialGridMode = 'ud';

    public override getName(): string {
        return 'spatial_grid_layer';
    }

    public override getTitle(): string {
        return 'Hotspots / UD';
    }

    public override getOlLayer(): BaseLayer {
        if (!this._layer) {
            this._source = new VectorSource({wrapX: false});
            this._layer = new VectorLayer({
                source: this._source,
                style: (feature: FeatureLike): Style[] => this._styleFor(feature)
            });
            this._layer.setZIndex(80);
        }

        return this._layer;
    }

    public setMode(mode: SpatialGridMode): void {
        this._mode = mode;
        this._layer?.changed();
    }

    public setCells(cells: SpatialGridCell[], cellLonDeg: number, cellLatDeg: number): void {
        this._cells = cells;
        this._cellLonDeg = cellLonDeg;
        this._cellLatDeg = cellLatDeg;
    }

    /**
     * Rebuild the rectangle features from the current cells.
     */
    public refresh(): void {
        if (!this._source) {
            return;
        }

        this._source.clear(true);

        if (this._cells.length === 0) {
            return;
        }

        const halfLon = this._cellLonDeg / 2;
        const halfLat = this._cellLatDeg / 2;

        const features = this._cells.map((c) => ({
            type: 'Feature',
            properties: {
                ud_level: c.ud_level,
                gi_z: c.gi_z
            },
            geometry: {
                type: 'Polygon',
                coordinates: [[
                    [c.lon - halfLon, c.lat - halfLat],
                    [c.lon + halfLon, c.lat - halfLat],
                    [c.lon + halfLon, c.lat + halfLat],
                    [c.lon - halfLon, c.lat + halfLat],
                    [c.lon - halfLon, c.lat - halfLat]
                ]]
            }
        }));

        const collection = {
            type: 'FeatureCollection',
            crs: {type: 'name', properties: {name: 'EPSG:4326'}},
            features
        };

        const olFeatures = new GeoJSON().readFeatures(collection, {featureProjection: 'EPSG:3857'});
        this._source.addFeatures(olFeatures);
    }

    /**
     * @protected
     */
    protected _styleFor(feature: FeatureLike): Style[] {
        const fill = this._mode === 'ud'
            ? SpatialGridLayer._udFill(feature.get('ud_level') as number)
            : SpatialGridLayer._giFill(feature.get('gi_z') as number | undefined);

        if (fill === null) {
            return [];
        }

        return [new Style({
            fill: new Fill({color: fill}),
            stroke: new Stroke({color: 'rgba(0,0,0,0.12)', width: 0.5})
        })];
    }

    /**
     * Fill for a UD isopleth level, or null when outside the 95 % contour.
     * @protected
     */
    protected static _udFill(level: number): string | null {
        if (level >= 2) {
            return 'rgba(203,24,29,0.55)';
        }
        if (level >= 1) {
            return 'rgba(253,174,97,0.45)';
        }
        return null;
    }

    /**
     * Diverging fill for a Gi* z-score, or null when not (near-)significant.
     * @protected
     */
    protected static _giFill(z: number | undefined): string | null {
        if (z === undefined) {
            return null;
        }
        if (z >= 2.58) {
            return 'rgba(165,0,38,0.60)';
        }
        if (z >= 1.96) {
            return 'rgba(244,109,67,0.50)';
        }
        if (z <= -2.58) {
            return 'rgba(49,54,149,0.60)';
        }
        if (z <= -1.96) {
            return 'rgba(69,117,180,0.50)';
        }
        return null;
    }

}