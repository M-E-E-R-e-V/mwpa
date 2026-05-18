import {Feature} from 'ol';
import {EsriJSON} from 'ol/format';
import BaseLayer from 'ol/layer/Base';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import {MapLayer} from '../MapLayer';

/**
 * Static area overlay loaded from an ESRI/GeoJSON URL — e.g. the
 * Natura-2000 protected-area polygons used on the Sighting page. The
 * source URL must be reachable from the browser (typically a file under
 * `/map_areas/...`); CORS errors surface as an empty layer.
 *
 * Each feature's SITENAME/SITECODE/URL properties are rendered into a
 * popover-friendly `content` HTML string at load time, so clicking a
 * polygon shows the area's metadata.
 */
export class AreaOverlayLayer extends MapLayer {

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
    protected _name: string;

    /**
     * @protected
     */
    protected _title: string;

    /**
     * @protected
     */
    protected _url: string;

    /**
     * @protected
     */
    protected _initiallyVisible: boolean;

    public constructor(name: string, title: string, url: string, visible: boolean = false) {
        super();
        this._name = name;
        this._title = title;
        this._url = url;
        this._initiallyVisible = visible;
    }

    public override getName(): string {
        return this._name;
    }

    public override getTitle(): string {
        return this._title;
    }

    public override getOlLayer(): BaseLayer {
        if (!this._layer) {
            this._source = new VectorSource();
            this._layer = new VectorLayer({
                source: this._source
            });
            this._layer.setZIndex(50);
            this._layer.setVisible(this._initiallyVisible);
        }

        return this._layer;
    }

    /**
     * Fetch + parse the ESRI JSON feed and populate the source. Safe to
     * call after {@link MapLayer.attachTo} — the layer is added to the
     * map immediately and features stream in once the fetch resolves.
     */
    public async loadFromUrl(): Promise<void> {
        if (!this._source) {
            return;
        }

        const response = await fetch(this._url);
        const json = await response.json();

        const features = new EsriJSON().readFeatures(json, {
            featureProjection: 'EPSG:3857'
        });

        for (const feature of features) {
            const sitename = (feature as Feature).get('SITENAME');
            if (sitename) {
                const sitecode = (feature as Feature).get('SITECODE');
                const url = (feature as Feature).get('URL');

                const urlContent = url ? `<a href="${url}" target="_blank">read more</a>` : '';

                (feature as Feature).setProperties({
                    content:
                        `<b>${sitename}</b><br>` +
                        `Site-Code: ${sitecode}<br>` +
                        '<br>' +
                        `${urlContent}`
                });
            }
        }

        this._source.addFeatures(features);
    }

}