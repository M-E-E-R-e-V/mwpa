import {
    Card,
    ContentCol,
    ContentColSize,
    ContentRow,
    SidebarMenuItem,
    SidebarMenuItemBadge,
    SidebarMenuTree
} from 'bambooo';
import {View, Map} from 'ol';
import {fromLonLat} from 'ol/proj';
import TileLayer from 'ol/layer/Tile';
import VectorLayer from 'ol/layer/Vector';
import {OSM} from 'ol/source';
import VectorSource from 'ol/source/Vector';
import {BasePage} from '../BasePage';
import {Tours} from '../Tours';

export class ToursMap extends BasePage {

    /**
     * page name
     * @protected
     */
    protected _name: string = 'tour_map';

    protected _tourId: number;

    /**
     * map object
     * @protected
     */
    protected _map: Map;

    /**
     * map source
     * @protected
     */
    protected _source: VectorSource;

    /**
     * constructor
     * @param {number} tourId
     */
    public constructor(tourId: number) {
        super();
        this._tourId = tourId;
    }

    /**
     * loadContent
     */
    public async loadContent(): Promise<void> {
        const menuItem = this._wrapper.getMainSidebar().getSidebar().getMenu().getMenuItem(Tours.NAME);
        let menuTree: SidebarMenuTree|null = null;

        const title = `Tour #${this._tourId}`;

        if (menuItem !== null) {
            menuTree = new SidebarMenuTree(menuItem);
            const pmenuItem = new SidebarMenuItem(menuTree);
            pmenuItem.setTitle(title);
            pmenuItem.setActiv(true);

            const badge = new SidebarMenuItemBadge(pmenuItem);
            badge.setContent('100');
        }

        const row1 = new ContentRow(this._wrapper.getContentWrapper().getContent());
        const card = new Card(new ContentCol(row1, ContentColSize.col12));

        card.setTitle(title);

        const mapElement = jQuery('<div></div>').appendTo(card.getElement());
        mapElement.css({
            height: '400px'
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

        this._map = new Map({
            layers: [tileLayer, vector],
            target: mapElement[0],
            view: new View({
                center: fromLonLat([11.030, 47.739]),
                zoom: 2.2,
                multiWorld: true
            })
        });
    }

}