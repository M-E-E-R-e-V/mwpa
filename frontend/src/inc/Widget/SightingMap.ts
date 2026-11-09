import {ComponentType, Widget2} from 'bambooo';
import {Map as OlMap} from 'ol';
import {Coordinate} from 'ol/coordinate';
import {Style} from 'ol/style';
import {BaseMap} from '../Map/BaseMap';
import {AreaOverlayLayer} from '../Map/Layers/AreaOverlayLayer';
import {BathymetryLayer} from '../Map/Layers/BathymetryLayer';
import {IdeeEsLayer} from '../Map/Layers/IdeeEsLayer';
import {MovementTracksLayer, SightingMovementLike} from '../Map/Layers/MovementTracksLayer';
import {OsmBaseLayer} from '../Map/Layers/OsmBaseLayer';
import {ProtectedAreaLayer} from '../Map/Layers/ProtectedAreaLayer';
import {SightingHeatmapLayer} from '../Map/Layers/SightingHeatmapLayer';
import {SightingPointsLayer, SightingMapPopupContent} from '../Map/Layers/SightingPointsLayer';
import {SightingMapObjectType, SightingStyles} from '../Map/Styles/SightingStyles';
import {MapLayerPanel} from './MapLayerPanel';

export {SightingMapObjectType} from '../Map/Styles/SightingStyles';
export type {SightingMapPopupContent} from '../Map/Layers/SightingPointsLayer';
export type {SightingMovementLike} from '../Map/Layers/MovementTracksLayer';

/**
 * Load options for {@link SightingMap.load}. Kept for backwards
 * compatibility with the legacy widget — `useHeatmap` and
 * `useBathymetriemap` opt the matching layers into the LayerSwitcher.
 */
export type SightingMapLoadOptions = {
    useHeatmap?: boolean;
    useBathymetriemap?: boolean;

    /**
     * Group nearby sighting points into count bubbles (points-only maps).
     */
    useCluster?: boolean;

    /**
     * Own layer panel ({@link MapLayerPanel}) instead of the OpenLayers
     * LayerSwitcher; sighting points + heatmap are left to the page's display
     * switch.
     */
    useLayerPanel?: boolean;
};

/**
 * How the sightings are drawn: grouped bubbles, single points or heatmap only.
 */
export type SightingMapDisplayMode = 'cluster' | 'points' | 'heat';

/**
 * Legacy convenience widget — now a thin compose over {@link BaseMap}
 * and the modular layer classes under `inc/Map/Layers/`. The public
 * surface (load, setView, addSighting, addLineRoute, addRawObject,
 * setMovementTracks, refrech, addAreaByJson, …) is preserved so the
 * Sighting and Tour pages continue to work without changes.
 *
 * New pages should use {@link BaseMap} + the layer modules directly
 * instead of this widget — see the OceanFishingMap page for the
 * preferred pattern.
 */
export class SightingMap extends Widget2 {

    /**
     * @protected
     */
    protected _base: BaseMap;

    /**
     * @protected
     */
    protected _points: SightingPointsLayer | undefined;

    /**
     * @protected
     */
    protected _movements: MovementTracksLayer | undefined;

    /**
     * @protected
     */
    protected _heatmap: SightingHeatmapLayer | undefined;

    /**
     * @protected
     */
    protected _bathymetry: BathymetryLayer | undefined;

    /**
     * @protected
     */
    protected _ideeEs: IdeeEsLayer | undefined;

    /**
     * @protected
     */
    protected _osm: OsmBaseLayer | undefined;

    /**
     * @protected
     */
    protected _loadOptions: SightingMapLoadOptions = {};

    /**
     * @protected
     */
    protected _layerPanel: MapLayerPanel | undefined;

    /**
     * @protected
     */
    protected _protectedAreas: ProtectedAreaLayer | undefined;

    public constructor(aelement?: ComponentType) {
        /*
         * BaseMap creates its own child div under `aelement`. We hold a
         * reference but never own a separate DOM node ourselves — the
         * `_element` we hand to Widget2 is the same one BaseMap uses.
         */
        const base = new BaseMap(aelement);
        super({element: base.getElement()});
        this._base = base;
    }

    public load(options?: SightingMapLoadOptions): void {
        if (options !== undefined) {
            this._loadOptions = options;
        }

        this._base.load({
            initialCenterLonLat: [11.030, 47.739],
            initialZoom: 2.2,
            withLayerSwitcher: this._loadOptions.useLayerPanel !== true
        });

        this._osm = new OsmBaseLayer();
        this._base.addLayer(this._osm);

        /*
         * Movements layer is always present (just hidden) so the Sighting
         * page can install a visibility-change listener before any data
         * is loaded.
         */
        this._movements = new MovementTracksLayer();
        this._base.addLayer(this._movements);

        /*
         * Points layer goes in via load() too — the legacy widget didn't
         * require addSighting to come after refrech, so the source must
         * exist immediately.
         */
        this._points = new SightingPointsLayer({cluster: this._loadOptions.useCluster === true});
        this._base.addLayer(this._points);

        if (this._loadOptions.useBathymetriemap) {
            this._bathymetry = new BathymetryLayer();
            this._base.addLayer(this._bathymetry);
        }

        /*
         * Spanish relief base-map matches the legacy widget's default
         * (added on every refresh there too) — kept on by default.
         */
        this._ideeEs = new IdeeEsLayer();
        this._base.addLayer(this._ideeEs);

        if (this._loadOptions.useHeatmap) {
            this._heatmap = new SightingHeatmapLayer();
            /*
             * Share the points layer's source so heatmap intensity
             * tracks the rendered sighting set exactly.
             */
            const src = this._points.getSource();
            if (src) {
                this._heatmap.setSource(src);
            }
            this._base.addLayer(this._heatmap);
        }

        if (this._loadOptions.useLayerPanel === true) {
            const container = this._base.getElement().parent();
            container.css('position', 'relative');
            this._layerPanel = new MapLayerPanel(container, this._base, [
                this._points.getName(),
                this._heatmap?.getName() ?? ''
            ]);
        }
    }

    public unload(): void {
        this._base.unload();
    }

    public disposePopover(andRemove: boolean = false): void {
        this._base.disposePopover(andRemove);
    }

    public setHeight(height: string | number): void {
        this._base.setHeight(height);
    }

    public updateSize(): void {
        this._base.updateSize();
    }

    public setView(viewCenter: Coordinate | null = null, viewZoom: number = 12.5): void {
        this._base.setView(viewCenter, viewZoom);
    }

    public getStyle(name: string): Style | undefined {
        return SightingStyles.get(name);
    }

    /**
     * @returns the underlying OL map. Escape hatch for code that needs
     * to wire custom interactions or controls.
     */
    public getOlMap(): OlMap | undefined {
        return this._base.getOlMap();
    }

    /**
     * @returns the underlying BaseMap. Use this when porting pages to
     * the modular layer API.
     */
    public getBaseMap(): BaseMap {
        return this._base;
    }

    public addSighting(
        type: SightingMapObjectType | string,
        id: string | number,
        content: string | SightingMapPopupContent,
        coordinate: Coordinate
    ): void {
        this._points?.addSighting(type, id, content, coordinate);
    }

    public addLineRoute(coordinates: number[][]): void {
        this._points?.addLineRoute(coordinates);
    }

    public addRawObject(object: object): void {
        this._points?.addRawObject(object);
    }

    public clearFeatureList(): void {
        this._points?.clearFeatures();
    }

    public async refrech(): Promise<void> {
        this._points?.refresh();
        /*
         * Heatmap shares the points source but needs an explicit rebuild
         * to re-rasterise its gradient — see SightingHeatmapLayer.refresh.
         */
        this._heatmap?.refresh();
    }

    public setMovementTracks(movements: SightingMovementLike[], append: boolean = false): void {
        this._movements?.setMovements(movements, append);
    }

    public clearMovementTracks(): void {
        this._movements?.clear();
    }

    public isMovementsLayerVisible(): boolean {
        return this._movements?.isVisible() ?? false;
    }

    public setOnMovementsVisibilityChange(cb: (visible: boolean) => void): void {
        this._movements?.setOnVisibilityChange(cb);
    }

    /**
     * Switch how the sightings are drawn. 'cluster' / 'points' need
     * `useCluster`, 'heat' needs `useHeatmap`.
     * @param {SightingMapDisplayMode} mode
     */
    public setDisplayMode(mode: SightingMapDisplayMode): void {
        this._points?.getOlLayer().setVisible(mode !== 'heat');
        this._points?.setClusterDistance(mode === 'cluster' ? 40 : 0);
        this._heatmap?.getOlLayer().setVisible(mode === 'heat');
        this._base.refreshLayerSwitcher();
    }

    /**
     * Fit the view to all loaded sighting points.
     * @return {boolean} false when there is nothing to fit
     */
    public fitToData(): boolean {
        const extent = this._points?.getDataExtent();
        const view = this._base.getOlMap()?.getView();

        if (!extent || !view) {
            return false;
        }

        view.fit(extent, {
            padding: [60, 60, 60, 60],
            maxZoom: 13,
            duration: 400
        });

        return true;
    }

    /**
     * Show protected areas (GeoJSON FeatureCollection string, EPSG:4326) and
     * list them in the layer panel.
     * @param {string} geojson
     * @param {string} status status line for the panel (translated)
     */
    public setProtectedAreas(geojson: string, status: string): void {
        if (!this._protectedAreas) {
            this._protectedAreas = new ProtectedAreaLayer();
            this._base.addLayer(this._protectedAreas);
        }

        this._protectedAreas.setGeoJson(geojson);
        this._layerPanel?.setAreaStatus(status);
        this._layerPanel?.setAreaLayer(this._protectedAreas);
        this.updateProtectedAreaCounts();
    }

    /**
     * Status of the protected areas without data yet (loading, no area, error).
     * @param {string} status translated
     */
    public setProtectedAreaStatus(status: string): void {
        this._layerPanel?.setAreaStatus(status);
    }

    /**
     * Count the loaded sighting points per protected area (panel badges +
     * default visibility).
     */
    public updateProtectedAreaCounts(): void {
        if (!this._protectedAreas || !this._layerPanel || !this._points) {
            return;
        }

        this._layerPanel.setAreaCounts(this._protectedAreas.countInside(this._points.getPointCoordinates()));
    }

    public async addAreaByJson(jsonFileUrl: string, title: string, name: string, visible: boolean = false): Promise<void> {
        const layer = new AreaOverlayLayer(name, title, jsonFileUrl, visible);
        this._base.addLayer(layer);
        await layer.loadFromUrl();
    }

}