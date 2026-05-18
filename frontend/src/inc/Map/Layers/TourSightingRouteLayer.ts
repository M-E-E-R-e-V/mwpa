import {GeoJSON} from 'ol/format';
import BaseLayer from 'ol/layer/Base';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import {Style} from 'ol/style';
import {MapLayer} from '../MapLayer';
import {SightingMapObjectType, SightingStyles} from '../Styles/SightingStyles';

/**
 * Buffered sub-route used by the Tour map: while the boat is inside a
 * sighting's time window, the sighting layer collects the coords. This
 * layer renders one polyline per sighting in the species' route colour
 * (mysticeti = dark blue, odontoceti = light blue, …).
 *
 * Use {@link addSightingRoute} per sighting then {@link refresh} to
 * commit. The species-group route style is picked up by `pointtype`
 * (e.g. `route_mysticeti` → {@link SightingStyles}).
 */
export class TourSightingRouteLayer extends MapLayer {

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
    protected _features: object[] = [];

    public override getName(): string {
        return 'tour_sighting_route_layer';
    }

    public override getTitle(): string {
        return 'Sighting routes';
    }

    public override getOlLayer(): BaseLayer {
        if (!this._layer) {
            this._source = new VectorSource({wrapX: false});
            this._layer = new VectorLayer({
                source: this._source,
                style: (feature): Style[] => {
                    const pointtype = feature.get('pointtype');
                    if (typeof pointtype !== 'string') {
                        return [];
                    }
                    const style = SightingStyles.get(pointtype);
                    return style ? [style] : [];
                }
            });
            this._layer.setZIndex(70);
        }

        return this._layer;
    }

    /**
     * Add one sighting's route. `pointtype` is typically the
     * species-group name (e.g. 'mysticeti') — the rendered colour comes
     * from the matching `route_*` style entry in {@link SightingStyles}.
     */
    public addSightingRoute(pointtype: string, coordinates: number[][]): void {
        if (coordinates.length < 2) {
            return;
        }

        const routeType = pointtype.startsWith('route_')
            ? pointtype
            : `${SightingMapObjectType.Route}_${pointtype}`;

        this._features.push({
            type: 'Feature',
            properties: {
                pointtype: routeType
            },
            geometry: {
                type: 'LineString',
                coordinates
            }
        });
    }

    public clearFeatures(): void {
        this._features = [];
    }

    public refresh(): void {
        if (!this._source) {
            return;
        }

        this._source.clear(true);

        if (this._features.length === 0) {
            return;
        }

        const collection = {
            type: 'FeatureCollection',
            crs: {type: 'name', properties: {name: 'EPSG:4326'}},
            features: this._features
        };

        const olFeatures = new GeoJSON().readFeatures(collection, {
            featureProjection: 'EPSG:3857'
        });
        this._source.addFeatures(olFeatures);
    }

}