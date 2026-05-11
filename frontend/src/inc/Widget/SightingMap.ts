import {Component} from 'bambooo';
import {Feature, Map as OlMap, Overlay, View} from 'ol';
import LayerSwitcher from 'ol-layerswitcher';
import {Coordinate} from 'ol/coordinate';
import {FeatureLike} from 'ol/Feature';
import {EsriJSON, GeoJSON} from 'ol/format';
import {LineString, Point} from 'ol/geom';
import {Heatmap} from 'ol/layer';
import BaseLayer from 'ol/layer/Base';
import TileLayer from 'ol/layer/Tile';
import VectorLayer from 'ol/layer/Vector';
import {fromLonLat, ProjectionLike} from 'ol/proj';
import {TileWMS} from 'ol/source';
import VectorSource from 'ol/source/Vector';
import RegularShape from 'ol/style/RegularShape';
import {Circle, Fill, Icon, Stroke, Style} from 'ol/style';
import XYZ from 'ol/source/XYZ';

export enum SightingMapObjectType {
    Route = 'route',
    RouteOdontoceti = 'route_odontoceti',
    RouteMysticeti = 'route_mysticeti',
    Start = 'start',
    End = 'end',
    Mysticeti = 'mysticeti',
    Odontoceti = 'odontoceti',
    Testudines = 'testudines',
    Boat = 'boat',
    /**
     * Per-segment polyline of a computed SightingMovement. Rendered
     * thinner than the legacy Route to stay readable when many
     * sightings overlap. `bad` segments get a dashed warning style.
     */
    MovementSegment = 'movement_segment',
    MovementSegmentBad = 'movement_segment_bad'
}

/**
 * Minimal shape consumed by {@link SightingMap.addMovementTrack}.
 * Matches `SightingMovementEntry` from the API client — kept structural
 * so the widget doesn't pull in the API module.
 */
export type SightingMovementLike = {
    sighting_id: number;
    /**
     * Aggregate fields used by the per-movement tooltip. All optional so
     * the page can pass a minimal shape during testing — the API client
     * type `SightingMovementEntry` already populates them.
     */
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

export type SightingMapPopupContent = () => string|any;

/**
 * Load map options
 */
export type SightingMapLoadOptions = {
    useHeatmap?: boolean;
    useBathymetriemap?: boolean;
};

/**
 * SightingMap
 */
export class SightingMap extends Component<HTMLDivElement> {

    /**
     * map object
     * @protected
     */
    protected _map: OlMap | undefined;

    /**
     * map source
     * @protected
     */
    protected _source: VectorSource | undefined;

    /**
     * tooltip popup
     * @protected
     */
    protected _tooltip_popup: any;

    /**
     * Layer Switcher
     * @protected
     */
    protected _layerSwitcher: LayerSwitcher | undefined;

    /**
     * Movements layer — dedicated VectorSource so toggling the layer's
     * visibility in the LayerSwitcher doesn't affect the main sightings
     * layer (and the source lives across `refrech()` calls, unlike the
     * geojson-features pipeline).
     * @protected
     */
    protected _movementsSource: VectorSource | undefined;

    /**
     * Movements layer — wraps {@link _movementsSource}. Created lazily in
     * {@link _createMap}; default visibility is **off**. Visibility flips
     * fire the {@link _onMovementsVisibilityChange} callback so the page
     * can lazy-fetch the actual data only when the user opens the layer.
     * @protected
     */
    protected _movementsLayer: VectorLayer<VectorSource> | undefined;

    /**
     * Caller-installed listener for the movements layer's visibility
     * toggles. The Sighting page uses this to lazy-fetch movement data
     * the first time the user enables the layer.
     * @protected
     */
    protected _onMovementsVisibilityChange: ((visible: boolean) => void) | undefined;

    /**
     * Popover
     * @protected
     */
    protected _popover: any|undefined;

    /**
     * geojson Features
     * @protected
     */
    protected _geojsonFeatures: object[] = [];

    /**
     * load options
     * @protected
     */
    protected _loadOptions: SightingMapLoadOptions = {};

    /**
     * Global styles
     * @protected
     */
    protected _styles: Map<string, Style> = new Map<string, Style>([
        [SightingMapObjectType.Route, new Style({
            stroke: new Stroke({
                width: 2
            }),
            fill: new Fill({
                color: 'rgba(255,0,0,0.5)'
            })
        })],
        [SightingMapObjectType.RouteOdontoceti, new Style({
            stroke: new Stroke({
                width: 10,
                color: '#85C1E9'
            })
        })],
        [SightingMapObjectType.RouteMysticeti, new Style({
            stroke: new Stroke({
                width: 10,
                color: '#2471A3'
            })
        })],
        [SightingMapObjectType.Start, new Style({
            image: new Circle({
                radius: 7,
                fill: new Fill({color: '#69e356'}),
                stroke: new Stroke({
                    color: 'black',
                    width: 1
                })
            })
        })],
        [SightingMapObjectType.End, new Style({
            image: new Circle({
                radius: 7,
                fill: new Fill({color: 'red'}),
                stroke: new Stroke({
                    color: 'black',
                    width: 1
                })
            })
        })],
        [SightingMapObjectType.Mysticeti, new Style({
            image: new Icon({
                src: 'images/marker-mysticeti.png',
                anchor: [0.5, 1],
                rotateWithView: false,
                size: [500, 500],
                scale: 0.1
            })
        })],
        [SightingMapObjectType.Odontoceti, new Style({
            image: new Icon({
                src: 'images/marker-odontoceti.png',
                anchor: [0.5, 1],
                rotateWithView: false,
                size: [500, 500],
                scale: 0.1
            })
        })],
        [SightingMapObjectType.Testudines, new Style({
            image: new Icon({
                src: 'images/marker-testudines.png',
                anchor: [0.5, 1],
                rotateWithView: false,
                size: [500, 500],
                scale: 0.1
            })
        })],
        [SightingMapObjectType.MovementSegment, new Style({
            stroke: new Stroke({
                width: 3,
                color: 'rgba(40, 116, 240, 0.85)'
            })
        })],
        [SightingMapObjectType.MovementSegmentBad, new Style({
            stroke: new Stroke({
                width: 2,
                color: 'rgba(220, 53, 69, 0.85)',
                lineDash: [6, 4]
            })
        })]
    ]);

    /**
     * Constructor
     * @param {any} aelement
     */
    public constructor(aelement?: any) {
        super(jQuery<HTMLDivElement>('<div></div>').appendTo(aelement));
    }

    /**
     * Create Map
     * @private
     */
    private _createMap(): void {
        const tileLayer = new TileLayer({
            source: new XYZ({
                url: '/mapcache/openstreetmap/{z}/{x}/{y}.png'
            })
        });

        this._source = new VectorSource({
            wrapX: false
        });

        const vector = new VectorLayer({
            source: this._source
        });

        // Movements layer — persistent across `refrech()` (which only
        // rebuilds the sightings/areas layers). LayerSwitcher picks it up
        // automatically because `title` is set. Starts hidden so the
        // page only pays the fetch cost when the user opens it.
        this._movementsSource = new VectorSource({wrapX: false});
        this._movementsLayer = new VectorLayer({
            source: this._movementsSource,
            visible: false,
            style: (feature: FeatureLike): Style[] => this._movementSegmentStyle(feature)
        });
        // @ts-ignore — `title` is a non-typed property used by ol-layerswitcher.
        this._movementsLayer.set('title', 'Movement tracks');
        this._movementsLayer.set('name', 'sigthing_movement_layer');
        this._movementsLayer.setZIndex(95);

        this._movementsLayer.on('change:visible', () => {
            const visible = this._movementsLayer?.getVisible() ?? false;
            if (this._onMovementsVisibilityChange) {
                this._onMovementsVisibilityChange(visible);
            }
        });

        this._map = new OlMap({
            layers: [tileLayer, vector, this._movementsLayer],
            target: this._element[0],
            view: new View({
                center: fromLonLat([11.030, 47.739]),
                zoom: 2.2,
                multiWorld: true
            })
        });
    }

    /**
     * Style one movement feature. Each `good` feature is a *merged*
     * LineString covering a whole run of consecutive good segments —
     * we draw the line plus exactly one arrow head at its last point
     * (rotated along the last leg). Bad segments come in as standalone
     * dashed lines and get no arrow — they're rare and visually flagged
     * by the colour alone.
     *
     * Keeping the icon count at "one per movement" (instead of one per
     * segment) is the single biggest win for render performance on
     * large filtered sets — same direction cue, far less work for OL.
     * @protected
     */
    protected _movementSegmentStyle(feature: FeatureLike): Style[] {
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
                // Bearing in screen-space (EPSG:3857). OL rotates the
                // shape clockwise from north — atan2(dx, dy) maps the
                // last leg's direction into that convention directly.
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
     * Set height
     * @param {string|number} height
     */
    public setHeight(height: string|number): void {
        this._element.css({
            height: `${height}px`
        });
    }

    /**
     * Load
     */
    public load(options?: SightingMapLoadOptions): void {
        this._createMap();
        this._createMapToolTip();

        if (options !== undefined) {
            this._loadOptions = options;
        }
    }

    /**
     * Unload
     */
    public unload(): void {
        jQuery('.popover').remove();

        if (this._tooltip_popup) {
            this._tooltip_popup.remove();
        }
    }

    /**
     * Dispose the Popup
     * @param {boolean} andRemove
     */
    public disposePopover(andRemove: boolean = false): void {
        if (this._popover) {
            this._popover.popover('dispose');

            if (andRemove) {
                this._popover.remove();
            }

            this._popover = undefined;
        }
    }

    protected _printLayerSwitcher(): void {
        if (this._map) {
            if (this._layerSwitcher) {
                this._map.removeControl(this._layerSwitcher);
            }

            this._layerSwitcher = new LayerSwitcher({
                reverse: true,
                groupSelectStyle: 'group'
            });

            this._map.addControl(this._layerSwitcher);
        }
    }

    /**
     * Create Map tooltip
     * @protected
     */
    protected _createMapToolTip(): void {
        if (!this._map) {
            return;
        }

        this._tooltip_popup = jQuery('<div id="popup"></div>').appendTo(jQuery('body'));

        const overlayTooltip = new Overlay({
            element: this._tooltip_popup[0],
            offset: [10, 0],
            positioning: 'bottom-left'
        });

        this._map.addOverlay(overlayTooltip);

        this._map.on('click', (evt) => {
            if (!this._map) {
                return;
            }

            const feature = this._map.forEachFeatureAtPixel(evt.pixel, (inFeature) => {
                return inFeature;
            });

            this.disposePopover();

            if (!feature) {
                return;
            }

            overlayTooltip.setPosition(evt.coordinate);

            this._popover = this._tooltip_popup.popover({
                html: true,
                content: () => {
                    const content = feature.get('content');

                    if (typeof content === 'string') {
                        return content;
                    } else if (typeof content === 'function') {
                        const returnContent = content();

                        if (typeof returnContent === 'string') {
                            return returnContent;
                        } else if (typeof returnContent === 'object') {
                            return jQuery(returnContent).html();
                        }
                    }

                    return 'None content found.';
                }
            });

            this._popover.popover('show');
        });

        this._map.on('pointermove', (evt) => {
            if (!this._map) {
                return;
            }

            const pixel = this._map.getEventPixel(evt.originalEvent);
            const hit = this._map.hasFeatureAtPixel(pixel);
            const target = this._map.getTarget();

            if (target) {
                // @ts-ignore
                if ('style' in target) {
                    target.style.cursor = hit ? 'pointer' : '';
                }
            }
        });

        this._map.on('movestart', () => {
            this.disposePopover();
        });
    }

    /**
     * Set the view
     * @param {Coordinate|null} viewCenter
     * @param {number} viewZoom
     */
    public setView(viewCenter: Coordinate|null = null, viewZoom: number = 12.5): void {
        if (!this._map) {
            return;
        }

        let center = fromLonLat([-17.3340221, 28.0525008]);

        if (viewCenter !== null) {
            center = viewCenter;
        }

        this._map.setView(new View({
            center,
            zoom: viewZoom,
            multiWorld: true
        }));
    }

    /**
     * Return the style
     * @param {string} name
     * @returns {Style|undefined}
     */
    public getStyle(name: string): Style|undefined {
        return this._styles.get(name);
    }

    /**
     * Add
     * @param {number[][]} coordinates
     */
    public addLineRoute(coordinates: number[][]): void {
        this._geojsonFeatures.push({
            type: 'Feature',
            properties: {
                pointtype: `${SightingMapObjectType.Route}`
            },
            geometry: {
                type: 'LineString',
                coordinates
            }
        });
    }

    /**
     * Add a raw Feature or etc.
     * @param {any} object
     */
    public addRawObject(object: any): void {
        this._geojsonFeatures.push(object);
    }

    /**
     * Replace or extend the movements layer's content with the segments
     * of the given movements. Each segment becomes one `LineString`
     * feature in the dedicated movements source — independent of
     * `_geojsonFeatures` and `_printLayer`, so refreshing the main
     * sightings layer doesn't disturb the tracks.
     *
     * Pass `append = true` to add features without clearing — used by
     * the page's chunked-loading flow to keep the UI responsive on
     * large filtered result sets. The default (`false`) clears first,
     * matching the original "render this exact set" semantics.
     *
     * Coordinates are emitted in [lon, lat] order (WGS84) and reprojected
     * to the map's view projection by the OL GeoJSON reader. Movements
     * with no segments contribute nothing.
     *
     * @param {SightingMovementLike[]} movements
     * @param {boolean} append
     */
    public setMovementTracks(movements: SightingMovementLike[], append: boolean = false): void {
        if (!this._movementsSource) {
            return;
        }

        if (!append) {
            this._movementsSource.clear(true);
        }

        /*
         * Per-movement representation:
         *   - One merged LineString that connects all consecutive "good"
         *     segments. The style function renders the line + a single
         *     end-arrow oriented along the last leg. That collapses what
         *     used to be N features per movement (one per segment) into
         *     1 — same shape on screen, an order of magnitude fewer
         *     features for the renderer to push around.
         *   - "bad" segments (GPS jumps) stay as standalone dashed
         *     LineStrings so they're visually flagged. They're rare and
         *     don't blow up the feature count.
         *
         * Tooltip is per-movement (summary stats), not per-segment.
         */
        const features: object[] = [];
        for (const movement of movements) {
            if (!movement.tracks || movement.tracks.length === 0) {
                continue;
            }

            const tooltip = SightingMap._buildMovementTooltip(movement);

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
                    // Close out the good run before the gap and emit the
                    // bad segment as its own feature.
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
                    continue;
                }

                if (currentRun.length === 0) {
                    currentRun.push([seg.start_lon, seg.start_lat]);
                }
                currentRun.push([seg.end_lon, seg.end_lat]);
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
        this._movementsSource.addFeatures(olFeatures);
    }

    /**
     * Drop every feature from the movements layer (but keeps the layer
     * itself + its visibility state). Useful when the page wants to
     * reset before a re-fetch without flipping the layer off-and-on.
     */
    public clearMovementTracks(): void {
        this._movementsSource?.clear(true);
    }

    /**
     * Whether the movements layer is currently visible in the
     * LayerSwitcher. Defaults to `false` (the layer starts hidden).
     */
    public isMovementsLayerVisible(): boolean {
        return this._movementsLayer?.getVisible() ?? false;
    }

    /**
     * Install a listener for the movements layer's visibility toggles.
     * The page uses this to lazy-fetch the data only when the user
     * opens the layer for the first time.
     */
    public setOnMovementsVisibilityChange(cb: (visible: boolean) => void): void {
        this._onMovementsVisibilityChange = cb;
    }

    /**
     * Build the HTML body of a movement's click-tooltip. One tooltip per
     * sighting (not per segment) — matches the per-movement rendering.
     * @protected
     */
    protected static _buildMovementTooltip(movement: SightingMovementLike): string {
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

    /**
     * Add a sighting
     * @param {SightingMapObjectType|string} type
     * @param {string} id
     * @param {string|SightingMapPopupContent} content
     * @param {Coordinate} coordinate
     */
    public addSighting(type: SightingMapObjectType|string, id: string|number, content: string|SightingMapPopupContent, coordinate: Coordinate): void {
        this._geojsonFeatures.push({
            type: 'Feature',
            properties: {
                pointtype: `${type}`,
                id,
                content
            },
            geometry: {
                type: 'Point',
                coordinates: coordinate
            }
        });
    }

    public async refrech(): Promise<void> {
        await this._printLayer();
    }

    public updateSize(): void {
        if (!this._map) {
            return;
        }

        this._map.updateSize();
    }

    /**
     * Print layer, move old layer and add new layer with new information
     * @protected
     */
    protected async _printLayer(): Promise<void> {
        if (!this._map) {
            return;
        }

        // first clear layers ------------------------------------------------------------------------------------------
        const layerNameList = [
            'sigthing_layer',
            'sigthing_heat_layer',
            'sigthing_bathymetrie_layer',
            'sigthing_idee_es_layer'
        ];

        const layers = this._map.getLayers();

        /*
         * Collect first, then remove. Calling layers.remove() inside layers.forEach()
         * skips one entry per match (OL Collection iteration walks by index and
         * remove shifts the array), so without staging this every refrech() leaks
         * a layer back into the LayerSwitcher — visible as duplicate legend entries.
         */
        const toRemove: BaseLayer[] = [];
        layers.forEach((layer) => {
            if (!layer || layer.get === undefined) {
                return;
            }

            const layerName = layer.get('name');

            if (layerName && layerNameList.indexOf(layerName) > -1) {
                toRemove.push(layer);
            }
        });

        for (const layer of toRemove) {
            layers.remove(layer);
        }

        console.log(this._map.getLayers());

        // Bathymetriemap ----------------------------------------------------------------------------------------------

        if (this._loadOptions.useBathymetriemap !== undefined && this._loadOptions.useBathymetriemap) {
            const bathymetry = new TileLayer({
                source: new TileWMS({
                    url: 'https://ows.emodnet-bathymetry.eu/wms',
                    params: {
                        LAYERS: 'mean_atlas_land'
                    }
                })
            });

            bathymetry.set('title', 'EMODnet Bathymetry');
            bathymetry.set('name', 'sigthing_bathymetrie_layer');
            bathymetry.set('base', true);
            bathymetry.setVisible(false);
            this._map.addLayer(bathymetry);
        }

        // TMS Relieve ES Map ------------------------------------------------------------------------------------------

        const tmsEs = new TileLayer({
            source: new XYZ({
                url: '/mapcache/tms-relieve.idee.es/{z}/{x}/{-y}.jpeg',
                projection: 'EPSG:3857' as ProjectionLike
            }),
            visible: true
        });

        tmsEs.set('title', 'IDEE ES');
        tmsEs.set('name', 'sigthing_idee_es_layer');
        tmsEs.set('base', true);

        this._map.addLayer(tmsEs);

        // reprint layers ----------------------------------------------------------------------------------------------

        const geojsonObject = {
            type: 'FeatureCollection',
            crs: {
                type: 'name',
                properties: {
                    name: 'EPSG:4326'
                }
            },
            features: this._geojsonFeatures
        };

        const geoJsonObj = new GeoJSON();
        const features = geoJsonObj.readFeatures(geojsonObject, {
            featureProjection: 'EPSG:3857'
        });

        const vectorSource = new VectorSource({
            features
        });

        const vectorLayer = new VectorLayer({
            source: vectorSource,
            style: (feature: FeatureLike): Style[] => {
                const styles: Style[] = [];

                const props = feature.getProperties() || {};

                if (props.pointtype) {
                    if (props.pointtype === SightingMapObjectType.Boat) {
                        const pstart = props.start as number[];
                        const pend = props.end as number[];

                        const dx = pend[0] - pstart[0];
                        const dy = pend[1] - pstart[1];
                        const rotation = Math.atan2(dy, dx);

                        styles.push(new Style({
                            geometry: new Point(fromLonLat(pstart)),
                            image: new Icon({
                                src: 'images/boat.png',
                                anchor: [0.5, 0.5],
                                rotateWithView: true,
                                rotation: -rotation,
                                size: [752, 752],
                                scale: 0.08
                            })
                        }));
                    } else {
                        const globalStyle = this._styles.get(props.pointtype);

                        if (globalStyle) {
                            styles.push(globalStyle);
                        }
                    }
                }

                return styles;
            }
        });

        vectorLayer.set('name', 'sigthing_layer');
        vectorLayer.set('title', 'Sightings');
        vectorLayer.setZIndex(99);
        this._map.addLayer(vectorLayer);

        // Heatmap -----------------------------------------------------------------------------------------------------

        if (this._loadOptions.useHeatmap !== undefined && this._loadOptions.useHeatmap) {
            const blur = 20;
            const radius = 10;

            const heatmaplayer = new Heatmap({
                title: 'HeatMap',
                // @ts-ignore
                source: vectorSource,
                blur,
                radius,
                weight: (): number => {
                    return 10;
                }
            });

            heatmaplayer.set('name', 'sigthing_heat_layer');
            vectorLayer.setZIndex(98);

            this._map.addLayer(heatmaplayer);
        }

        // reprint layer switcher
        this._printLayerSwitcher();
    }

    public async addAreaByJson(jsonFileUrl: string, title: string, name: string, visible: boolean = false): Promise<void> {
        if (!this._map) {
            return;
        }

        const response = await fetch(jsonFileUrl);

        const esriJsonObject = await response.json();

        const esriJsonObj = new EsriJSON();
        const features = esriJsonObj.readFeatures(esriJsonObject, {
            featureProjection: 'EPSG:3857'
        });

        features.forEach((feature: Feature) => {
            const sitename = feature.get('SITENAME');

            if (sitename) {
                const sitecode = feature.get('SITECODE');
                const url = feature.get('URL');

                let urlContent = '';

                if (url) {
                    urlContent = `<a href="${url}" target="_blank">read more</a>`;
                }

                feature.setProperties({
                    content:
                        `<b>${sitename}</b><br>` +
                        `Site-Code: ${sitecode}<br>` +
                        '<br>' +
                        `${urlContent}`
                });
            }
        });

        const vectorSource = new VectorSource({
            features
        });

        const vectorLayer = new VectorLayer({
            source: vectorSource
        });

        vectorLayer.set('title', title);
        vectorLayer.set('name', name);
        vectorLayer.setZIndex(50);
        vectorLayer.setVisible(visible);

        this._map.addLayer(vectorLayer);
    }

    public clearFeatureList(): void {
        this._geojsonFeatures = [];
    }

}