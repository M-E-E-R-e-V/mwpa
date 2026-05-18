import {Component} from 'bambooo';
import {Map as OlMap} from 'ol';
import {Coordinate} from 'ol/coordinate';
import {Style} from 'ol/style';
import {BaseMap} from '../Map/BaseMap';
import {AreaOverlayLayer} from '../Map/Layers/AreaOverlayLayer';
import {BathymetryLayer} from '../Map/Layers/BathymetryLayer';
import {IdeeEsLayer} from '../Map/Layers/IdeeEsLayer';
import {MovementTracksLayer, SightingMovementLike} from '../Map/Layers/MovementTracksLayer';
import {OsmBaseLayer} from '../Map/Layers/OsmBaseLayer';
import {SightingHeatmapLayer} from '../Map/Layers/SightingHeatmapLayer';
import {SightingPointsLayer, SightingMapPopupContent} from '../Map/Layers/SightingPointsLayer';
import {SightingMapObjectType, SightingStyles} from '../Map/Styles/SightingStyles';

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
};

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
export class SightingMap extends Component<HTMLDivElement> {

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

    public constructor(aelement?: any) {
        /*
         * BaseMap creates its own child div under `aelement`. We hold a
         * reference but never own a separate DOM node ourselves — the
         * `_element` we hand to Component is the same one BaseMap uses.
         */
        const base = new BaseMap(aelement);
        super(base.getElement());
        this._base = base;
    }

    public load(options?: SightingMapLoadOptions): void {
        if (options !== undefined) {
            this._loadOptions = options;
        }

        this._base.load({
            initialCenterLonLat: [11.030, 47.739],
            initialZoom: 2.2
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
        this._points = new SightingPointsLayer();
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
        // Heatmap shares the points source but needs an explicit rebuild
        // to re-rasterise its gradient — see SightingHeatmapLayer.refresh.
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

    public async addAreaByJson(jsonFileUrl: string, title: string, name: string, visible: boolean = false): Promise<void> {
        const layer = new AreaOverlayLayer(name, title, jsonFileUrl, visible);
        this._base.addLayer(layer);
        await layer.loadFromUrl();
    }

}