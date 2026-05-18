import {FeatureLike} from 'ol/Feature';
import {GeoJSON} from 'ol/format';
import {LineString, Point} from 'ol/geom';
import BaseLayer from 'ol/layer/Base';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import RegularShape from 'ol/style/RegularShape';
import {Fill, Stroke, Style} from 'ol/style';
import {MapLayer} from '../MapLayer';

/**
 * Minimal shape consumed by {@link MovementTracksLayer.setMovements}.
 * Matches `SightingMovementEntry` from the API client — kept structural
 * so the layer doesn't pull in the API module.
 */
export type SightingMovementLike = {
    sighting_id: number;
    source?: string;
    total_distance_m?: number;
    total_duration_s?: number;
    avg_speed_mps?: number;
    max_speed_mps?: number;
    dominant_heading_deg?: number;
    tracks: {
        start_lat: number;
        start_lon: number;
        end_lat: number;
        end_lon: number;
        quality: 'good' | 'bad' | string;
        heading_deg?: number;
        speed_mps?: number;
        distance_m?: number;
        duration_s?: number;
    }[];
};

/**
 * Dedicated vector layer for computed movement tracks. Lives in its
 * own VectorSource (independent of the main sighting features) so
 * toggling visibility in the LayerSwitcher or refreshing the sighting
 * layer doesn't disturb the tracks.
 *
 * Starts hidden — the page lazy-fetches movement data the first time
 * the user opens the layer in the LayerSwitcher
 * (see {@link setOnVisibilityChange}). One merged LineString per
 * movement keeps the feature count bounded on large filtered sets;
 * `bad` segments stay as standalone dashed lines so they remain
 * visually flagged.
 */
export class MovementTracksLayer extends MapLayer {

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
    protected _onVisibilityChange: ((visible: boolean) => void) | undefined;

    public override getName(): string {
        return 'sigthing_movement_layer';
    }

    public override getTitle(): string {
        return 'Movement tracks';
    }

    public override getOlLayer(): BaseLayer {
        if (!this._layer) {
            this._source = new VectorSource({wrapX: false});
            this._layer = new VectorLayer({
                source: this._source,
                visible: false,
                style: (feature: FeatureLike): Style[] => MovementTracksLayer._styleFor(feature)
            });
            this._layer.setZIndex(95);

            this._layer.on('change:visible', () => {
                const visible = this._layer?.getVisible() ?? false;
                if (this._onVisibilityChange) {
                    this._onVisibilityChange(visible);
                }
            });
        }

        return this._layer;
    }

    public setOnVisibilityChange(cb: (visible: boolean) => void): void {
        this._onVisibilityChange = cb;
    }

    public isVisible(): boolean {
        return this._layer?.getVisible() ?? false;
    }

    public clear(): void {
        this._source?.clear(true);
    }

    /**
     * Replace or extend the layer's content with the segments of the
     * given movements. Pass `append = true` to add features without
     * clearing — used by the chunked-loading flow on the Sighting page
     * to keep the UI responsive.
     */
    public setMovements(movements: SightingMovementLike[], append: boolean = false): void {
        if (!this._source) {
            return;
        }

        if (!append) {
            this._source.clear(true);
        }

        const features: object[] = [];
        for (const movement of movements) {
            if (!movement.tracks || movement.tracks.length === 0) {
                // eslint-disable-next-line no-continue
                continue;
            }

            const tooltip = MovementTracksLayer._buildTooltip(movement);

            let currentRun: number[][] = [];
            const flushRun = (): void => {
                if (currentRun.length < 2) {
                    currentRun = [];
                    return;
                }
                features.push({
                    type: 'Feature',
                    properties: {
                        sighting_id: movement.sighting_id,
                        quality: 'good',
                        content: tooltip
                    },
                    geometry: {
                        type: 'LineString',
                        coordinates: currentRun
                    }
                });
                currentRun = [];
            };

            for (const seg of movement.tracks) {
                if (seg.quality === 'bad') {
                    flushRun();
                    features.push({
                        type: 'Feature',
                        properties: {
                            sighting_id: movement.sighting_id,
                            quality: 'bad',
                            content: tooltip
                        },
                        geometry: {
                            type: 'LineString',
                            coordinates: [
                                [seg.start_lon, seg.start_lat],
                                [seg.end_lon, seg.end_lat]
                            ]
                        }
                    });
                } else {
                    if (currentRun.length === 0) {
                        currentRun.push([seg.start_lon, seg.start_lat]);
                    }
                    currentRun.push([seg.end_lon, seg.end_lat]);
                }
            }
            flushRun();
        }

        if (features.length === 0) {
            return;
        }

        const collection = {
            type: 'FeatureCollection',
            crs: {type: 'name', properties: {name: 'EPSG:4326'}},
            features
        };

        const olFeatures = new GeoJSON().readFeatures(collection, {
            featureProjection: 'EPSG:3857'
        });
        this._source.addFeatures(olFeatures);
    }

    /**
     * Per-movement style: `bad` features are dashed red lines with no
     * arrow; `good` features get a blue line plus exactly one arrow
     * head at the end, rotated along the last leg. One arrow per
     * movement (not per segment) is the main render-performance win on
     * large filtered sets.
     * @protected
     */
    protected static _styleFor(feature: FeatureLike): Style[] {
        const props = feature.getProperties() ?? {};
        const isBad = props.quality === 'bad';

        if (isBad) {
            return [new Style({
                stroke: new Stroke({
                    width: 2,
                    color: 'rgba(220, 53, 69, 0.85)',
                    lineDash: [6, 4]
                })
            })];
        }

        const styles: Style[] = [new Style({
            stroke: new Stroke({
                width: 3,
                color: 'rgba(40, 116, 240, 0.85)'
            })
        })];

        const geom = feature.getGeometry();
        if (geom && geom.getType() === 'LineString') {
            const lineGeom = geom as LineString;
            const coords = lineGeom.getCoordinates();
            if (coords.length >= 2) {
                const end = coords[coords.length - 1];
                const prev = coords[coords.length - 2];
                const rotation = Math.atan2(end[0] - prev[0], end[1] - prev[1]);

                styles.push(new Style({
                    geometry: new Point(end),
                    image: new RegularShape({
                        points: 3,
                        radius: 7,
                        fill: new Fill({color: 'rgba(40, 116, 240, 0.95)'}),
                        stroke: new Stroke({color: 'rgba(255, 255, 255, 0.9)', width: 1.5}),
                        rotation,
                        rotateWithView: true
                    })
                }));
            }
        }

        return styles;
    }

    /**
     * @protected
     */
    protected static _buildTooltip(movement: SightingMovementLike): string {
        const fmt = (n: number, digits: number): string => Number(n).toFixed(digits);

        const rows: string[] = [];
        rows.push(`<b>Sighting #${movement.sighting_id}</b>`);

        if (movement.total_distance_m !== undefined) {
            const km = movement.total_distance_m / 1000;
            rows.push(km >= 1
                ? `Distance: ${fmt(km, 2)} km`
                : `Distance: ${fmt(movement.total_distance_m, 0)} m`);
        }
        if (movement.total_duration_s !== undefined && movement.total_duration_s > 0) {
            const minutes = movement.total_duration_s / 60;
            rows.push(minutes >= 1
                ? `Duration: ${fmt(minutes, 1)} min`
                : `Duration: ${fmt(movement.total_duration_s, 0)} s`);
        }
        if (movement.avg_speed_mps !== undefined) {
            const kmh = movement.avg_speed_mps * 3.6;
            rows.push(`Avg speed: ${fmt(kmh, 1)} km/h`);
        }
        if (movement.max_speed_mps !== undefined) {
            const kmh = movement.max_speed_mps * 3.6;
            rows.push(`Max speed: ${fmt(kmh, 1)} km/h`);
        }
        if (movement.dominant_heading_deg !== undefined) {
            rows.push(`Dominant heading: ${fmt(movement.dominant_heading_deg, 0)}°`);
        }
        if (movement.source && movement.source !== 'tracking') {
            rows.push(`<span style="color:#6c757d">Source: ${movement.source}</span>`);
        }

        return rows.join('<br>');
    }

}