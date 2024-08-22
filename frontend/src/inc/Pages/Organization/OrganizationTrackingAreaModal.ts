import {ButtonDefault, ModalDialog, ModalDialogType} from 'bambooo';
import {Map as OlMap, View} from 'ol';
import {GeoJSON} from 'ol/format';
import {Draw, Modify, Snap} from 'ol/interaction';
import TileLayer from 'ol/layer/Tile';
import VectorLayer from 'ol/layer/Vector';
import {fromLonLat} from 'ol/proj';
import {OSM} from 'ol/source';
import VectorSource from 'ol/source/Vector';

/**
 * OrganizationTrackingAreaModalButtonClickFn
 */
type OrganizationTrackingAreaModalButtonClickFn = () => void;

/**
 * OrganizationTrackingAreaModal
 * @see for a patch https://jsfiddle.net/ko822xjw/
 */
export class OrganizationTrackingAreaModal extends ModalDialog {

    /**
     * ID from tracking area
     * @protected
     */
    protected _id: number|null = null;

    /**
     * Organization id
     * @protected
     */
    protected _orgId: number|null = null;

    /**
     * map object
     * @protected
     */
    protected _map: OlMap;

    /**
     * map source
     * @protected
     */
    protected _source: VectorSource;

    /**
     * ol draw
     * @protected
     */
    protected _draw: Draw | null = null;

    /**
     * ol Modify
     * @protected
     */
    protected _modify: Modify;

    /**
     * ol snap
     * @protected
     */
    protected _snap: Snap| null = null;

    /**
     * allow drawing
     * @protected
     */
    protected _startDrawing: boolean = false;

    /**
     * on save click
     * @protected
     */
    protected _onSaveClick: OrganizationTrackingAreaModalButtonClickFn|null = null;

    /**
     * All marked points
     * @protected
     */
    protected _geoJsonStr: string = '';

    /**
     * constructor
     * @param elementObject
     */
    public constructor(elementObject: Element) {
        super(elementObject, 'organizationtrackingareamodal', ModalDialogType.large);

        const bodyCard = jQuery('<div class="card-body"/>').appendTo(this._body);

        const wrapperHeight = 450;

        const mapElement = jQuery('<div></div>').appendTo(bodyCard);
        mapElement.css({
            height: `${wrapperHeight}px`
        });

        const tileLayer = new TileLayer({
            source: new OSM({
                wrapX: false
            })
        });

        this._source = new VectorSource({
            wrapX: false
        });

        const vector = new VectorLayer({
            source: this._source
        });

        this._map = new OlMap({
            layers: [tileLayer, vector],
            target: mapElement[0],
            view: new View({
                center: fromLonLat([11.030, 47.739]),
                zoom: 2.2,
                multiWorld: true
            })
        });

        this._modify = new Modify({source: this._source});
        this._modify.on('modifyend', (event): void => {
            console.log('Modify::modifyend: on event call');

            const collection = event.features;

            const writer = new GeoJSON({
                featureProjection: 'EPSG:3857',
                dataProjection: 'EPSG:4326'
            });

            this._geoJsonStr = writer.writeFeatures(collection.getArray());
            console.log(this._geoJsonStr);
        });

        this._map.addInteraction(this._modify);

        this._createDraw();

        const btnPlay = new ButtonDefault(bodyCard, 'Start Editing', 'fa-play');
        const btnStop = new ButtonDefault(bodyCard, 'Stop Editing', 'fa-stop');
        const btnClear = new ButtonDefault(bodyCard, 'Clear Points', 'fa-trash');
        btnStop.hide();

        btnPlay.setOnClickFn(() => {
            this._startDraw();
            btnPlay.hide();
            btnClear.hide();
            btnStop.show();
        });

        btnStop.setOnClickFn(() => {
            this._stopDraw();
            btnPlay.show();
            btnClear.show();
            btnStop.hide();
        });

        btnClear.setOnClickFn(() => {
            this._source.clear();
        });

        // buttons -----------------------------------------------------------------------------------------------------

        jQuery('<button type="button" class="btn btn-default" data-dismiss="modal">Close</button>').appendTo(this._footer);
        const btnSave = jQuery('<button type="button" class="btn btn-primary">Save changes</button>').appendTo(this._footer);

        btnSave.on('click', (): void => {
            if (this._onSaveClick !== null) {
                this._onSaveClick();
            }
        });
    }

    private _startDraw(): void {
        if (this._draw) {
            this._snap = new Snap({source: this._source});
            this._map.addInteraction(this._snap);
            this._draw.setActive(true);
            this._map.addInteraction(this._draw);
            this._startDrawing = true;
        }
    }

    private _stopDraw(): void {
        if (this._snap) {
            this._map.removeInteraction(this._snap);
            this._snap = null;
        }

        if (this._draw) {
            this._draw.setActive(false);
            this._draw.finishDrawing();
            this._map.removeInteraction(this._draw);
            this._draw = null;
        }

        this._startDrawing = false;
    }

    private _createDraw(): void {
        this._draw = new Draw({
            source: this._source,
            type: 'Polygon',
            condition: (event): boolean => {
                const click = event.type === 'pointerdown';

                if (this._startDrawing) {
                    return click;
                }

                return false;
            }
        });

        this._draw.on('drawend', (event): void => {
            console.log('Draw::drawend: on event call');

            const writer = new GeoJSON({
                featureProjection: 'EPSG:3857',
                dataProjection: 'EPSG:4326'
            });

            this._geoJsonStr = writer.writeFeatures([event.feature]);
        });
    }

    /**
     * Set map position from Organization
     * @param lon
     * @param lat
     */
    public setOrganizationPosition(lon: number, lat: number): void {
        this._map.setView(new View({
            center: fromLonLat([lon, lat]),
            zoom: 16,
            multiWorld: true
        }));
    }

    /**
     * getGeoJsonStr
     * @returns {string}
     */
    public getGeoJsonStr(): string {
        return this._geoJsonStr;
    }

    /**
     * setGeoJsonStr
     * @param {string} str
     */
    public setGeoJsonStr(str: string): void {
        const obj = new GeoJSON({
            featureProjection: 'EPSG:3857',
            dataProjection: 'EPSG:4326'
        }).readFeatures(str);

        console.log(str);
        this._source.addFeatures(obj);
    }

    /**
     * Set id from tracking area
     * @param {number} id
     */
    public setId(id: number): void {
        this._id = id;
    }

    /**
     * Return id from tracking area
     * @returns {number|null}
     */
    public getId(): number|null {
        return this._id;
    }

    /**
     * Set organization id
     * @param {number} id
     */
    public setOrgId(id: number): void {
        this._orgId = id;
    }

    /**
     * Return organization id
     * @returns {number|null}
     */
    public getOrgId(): number|null {
        return this._orgId;
    }

    /**
     * resetValues
     */
    public override resetValues(): void {
        this._source.clear();

        if (this._snap) {
            this._map.removeInteraction(this._snap);
            this._snap = null;
        }

        if (this._draw) {
            this._map.removeInteraction(this._draw);
            this._draw = null;
        }

        this._createDraw();
        this._id = null;
        this._orgId = null;
    }

    /**
     * setOnSave
     * @param onSave
     */
    public setOnSave(onSave: OrganizationTrackingAreaModalButtonClickFn): void {
        this._onSaveClick = onSave;
    }

}