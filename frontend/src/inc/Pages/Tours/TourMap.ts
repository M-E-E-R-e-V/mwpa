import {
    Card,
    ContentCol,
    ContentColSize,
    ContentRow,
    SidebarMenuItem,
    SidebarMenuItemBadge,
    SidebarMenuTree
} from 'bambooo';
import moment from 'moment/moment';
import {View, Map as OlMap, Feature, Overlay} from 'ol';
import {GeoJSON} from 'ol/format';
import {Point} from 'ol/geom';
import {fromLonLat} from 'ol/proj';
import TileLayer from 'ol/layer/Tile';
import VectorLayer from 'ol/layer/Vector';
import {OSM} from 'ol/source';
import VectorSource from 'ol/source/Vector';
import {Circle, Fill, Icon, Stroke, Style} from 'ol/style';
import {Tours as ToursAPI} from '../../Api/Tours';
import {Species as SpeciesAPI, SpeciesEntry} from '../../Api/Species';
import {GeolocationCoordinates} from '../../Types/GeolocationCoordinates';
import {UtilDistanceCoast} from '../../Utils/UtilDistanceCoast';
import {UtilLocation} from '../../Utils/UtilLocation';
import {BasePage} from '../BasePage';
import {Tours} from '../Tours';

type TourSightingData = {
    pointtype: string;
    points: number[][];
    timestamp_start: number;
    timestamp_end: number;
    species_id: number;
    species_name: string;
    species_count: number;
    distance_coast: string;
    files: string[];
};

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
    protected _map: OlMap;

    /**
     * map source
     * @protected
     */
    protected _source: VectorSource;

    /**
     * tooltip popup
     * @protected
     */
    protected _tooltip_popup: any;

    protected _badge: SidebarMenuItemBadge|null = null;

    protected _popover: any|undefined;

    /**
     * constructor
     * @param {number} tourId
     */
    public constructor(tourId: number) {
        super();
        this._tourId = tourId;
    }

    public async unloadContent(): Promise<void> {
        this.disposePopover(true);
        jQuery('.popover').remove();

        if (this._tooltip_popup) {
            this._tooltip_popup.remove();
        }
    }

    public disposePopover(andRemove: boolean = false): void {
        if (this._popover) {
            this._popover.popover('dispose');

            if (andRemove) {
                this._popover.remove();
            }

            this._popover = undefined;
        }
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

            this._badge = new SidebarMenuItemBadge(pmenuItem);
            this._badge.setContent('0');
        }

        const row1 = new ContentRow(this._wrapper.getContentWrapper().getContent());
        const card = new Card(new ContentCol(row1, ContentColSize.col12));

        card.setTitle(title);

        const wrapperHeight = this._wrapper.getElement().height() - 220;

        const mapElement = jQuery('<div></div>').appendTo(card.getElement());
        mapElement.css({
            height: `${wrapperHeight}px`
        });

        this._tooltip_popup = jQuery('<div id="popup"></div>').appendTo(this._wrapper.getContentWrapper().getContent().getElement());

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

        // https://crossfilter.github.io/crossfilter/
        // https://blog.csdn.net/weixin_57933935/article/details/125922646
        // https://github.com/openlayers/openlayers/issues/9113
        this._map = new OlMap({
            layers: [tileLayer, vector],
            target: mapElement[0],
            view: new View({
                center: fromLonLat([11.030, 47.739]),
                zoom: 2.2,
                multiWorld: true
            })
        });

        // tooltip -----------------------------------------------------------------------------------------------------

        const overlayTooltip = new Overlay({
            element: this._tooltip_popup[0],
            offset: [10, 0],
            positioning: 'bottom-left'
        });

        this._map.addOverlay(overlayTooltip);

        this._map.on('click', (evt) => {
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
                    return feature.get('content');
                }
            });

            this._popover.popover('show');
        });

        this._map.on('pointermove', (evt) => {
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

        this._onLoadTable = async(): Promise<void> => {
            this._map.setView(new View({
                center: fromLonLat([-17.3340221, 28.0525008]),
                zoom: 12.5,
                multiWorld: true
            }));

            // species -------------------------------------------------------------------------------------------------

            const species = await SpeciesAPI.getList();
            const mspecies = new Map<number, SpeciesEntry>();

            if (species) {
                for (const tspecies of species) {
                    mspecies.set(tspecies.id, tspecies);
                }
            }

            const trackingData = await ToursAPI.getTrackingList(this._tourId);

            if (trackingData) {
                const trackDate = moment(trackingData.date?.split(' ')[0]);

                card.setTitle(`${title} - <b>${trackDate.format('YYYY.MM.DD')}</b> - begin: ${trackingData.start} end: ${trackingData.end}`);

                let geojsonFeatires: object[] = [];
                const positionSort = new Map<number, GeolocationCoordinates>();
                const sighPostionTrack = new Map<number, TourSightingData>();

                // add sightings ---------------------------------------------------------------------------------------

                if (trackingData.sightings.length > 0) {
                    this._badge.setContent(trackingData.sightings.length);
                }

                for (const sighting of trackingData.sightings) {
                    const sightPostionTrackData: TourSightingData = {
                        points: [],
                        pointtype: sighting.pointtype,
                        timestamp_start: 0,
                        timestamp_end: 0,
                        species_id: sighting.species_id,
                        species_name: sighting.species_name,
                        species_count: sighting.species_count,
                        distance_coast: sighting.distance_coast,
                        files: sighting.files
                    };

                    try {
                        const posObjBegin = JSON.parse(sighting.location_begin) as GeolocationCoordinates;

                        if (posObjBegin.timestamp) {
                            sightPostionTrackData.timestamp_start = posObjBegin.timestamp;
                        }
                    } catch (e) {
                        console.log(e);
                    }

                    try {
                        const posObjEnd = JSON.parse(sighting.location_end) as GeolocationCoordinates;

                        if (posObjEnd.timestamp) {
                            sightPostionTrackData.timestamp_end = posObjEnd.timestamp;
                        }
                    } catch (e) {
                        console.log(e);
                    }

                    sighPostionTrack.set(sighting.id, sightPostionTrackData);
                }

                // tour tracking ---------------------------------------------------------------------------------------

                for (const position of trackingData.positions) {
                    try {
                        const posObj = JSON.parse(position) as GeolocationCoordinates;

                        if (posObj.timestamp) {
                            positionSort.set(posObj.timestamp, posObj);
                        }
                    } catch (e) {
                        console.log(e);
                    }
                }

                const positionListObj = [...positionSort].sort();

                const coordList: number[][] = [];

                let index = 0;
                let start: GeolocationCoordinates;
                let end: GeolocationCoordinates;

                const boatDirection: object[] = [];

                for (const [timestamp, value] of positionListObj) {
                    if (index === 0) {
                        start = value;
                    }

                    // hold point for sighting -------------------------------------------------------------------------

                    for (const [sightingid, sighting] of sighPostionTrack) {
                        if (timestamp >= sighting.timestamp_start && timestamp <= sighting.timestamp_end) {
                            sighting.points.push([value.longitude, value.latitude]);
                        }

                        sighPostionTrack.set(sightingid, sighting);
                    }

                    // add coord ---------------------------------------------------------------------------------------

                    coordList.push([value.longitude, value.latitude]);

                    // add boat direction ------------------------------------------------------------------------------

                    if (index > 0 && (index % 400 === 0)) {
                        boatDirection.push({
                            type: 'Feature',
                            properties: {
                                pointtype: 'boat',
                                start: [end.longitude, end.latitude],
                                end: [value.longitude, value.latitude]
                            },
                            geometry: {
                                type: 'Point',
                                coordinates: [value.longitude, value.latitude]
                            }
                        });
                    }

                    end = value;
                    index++;
                }

                // add boat directions ---------------------------------------------------------------------------------

                geojsonFeatires = geojsonFeatires.concat(boatDirection);

                // create track for sighting ---------------------------------------------------------------------------

                for (const [sightingId, sighting] of sighPostionTrack) {
                    geojsonFeatires.push({
                        type: 'Feature',
                        properties: {
                            pointtype: `route_${sighting.pointtype}`
                        },
                        geometry: {
                            type: 'LineString',
                            coordinates: sighting.points
                        }
                    });

                    const speciesEntry = mspecies.get(sighting.species_id);
                    let speciesName = '';

                    if (speciesEntry) {
                        speciesName = speciesEntry.name;
                    } else {
                        speciesName = sighting.species_name;
                    }

                    const floatDistance = parseFloat(sighting.distance_coast!) || 0;

                    let latStr = '';
                    let lonStr = '';

                    try {
                        const lat = UtilLocation.ddToDm(sighting.points[0][1], true);

                        latStr = `${lat.direction}: ${lat.degree}º ${lat.minute.toFixed(3)}`;
                    } catch (e) {
                        console.log(e);
                    }

                    try {
                        const lon = UtilLocation.ddToDm(sighting.points[0][0], false);

                        lonStr = `${lon.direction}: ${lon.degree}º ${lon.minute.toFixed(3)}`;
                    } catch (e) {
                        console.log(e);
                    }

                    let images = '';

                    for (const file of sighting.files) {
                        images += `<br><img width="200px" src="/json/sightings/getimage/${sightingId}/${file}">`;
                    }

                    const speStartTime = moment(sighting.timestamp_start);

                    geojsonFeatires.push({
                        type: 'Feature',
                        properties: {
                            pointtype: sighting.pointtype,
                            id: sightingId,
                            content:
                                `<b>Species</b>: ${speciesName}<br>` +
                                `<b>Group-Size</b>: ${sighting.species_count}<br>` +
                                `<b>Distance (Miles)</b>: ${UtilDistanceCoast.meterToM(floatDistance, true)}<br>` +
                                `<b>Date/Time</b>: ${speStartTime.format('YYYY.MM.DD HH:mm:ss')}<br>` +
                                `<b>Position</b>: ${latStr} - ${lonStr}<br>` +
                                images
                        },
                        geometry: {
                            type: 'Point',
                            coordinates: sighting.points[0]
                        }
                    });
                }

                // add line routes -------------------------------------------------------------------------------------

                geojsonFeatires.push({
                    type: 'Feature',
                    properties: {
                        pointtype: 'route'
                    },
                    geometry: {
                        type: 'LineString',
                        coordinates: coordList
                    }
                });

                // add start -------------------------------------------------------------------------------------------

                const startTime = moment(start.timestamp);

                geojsonFeatires.push({
                    type: 'Feature',
                    properties: {
                        pointtype: 'start',
                        content: `Tour-Start at: <b>${startTime.format('YYYY.MM.DD HH:mm:ss')}</b>`
                    },
                    geometry: {
                        type: 'Point',
                        coordinates: [start.longitude, start.latitude]
                    }
                });

                // add end ---------------------------------------------------------------------------------------------

                const endTime = moment(end.timestamp);

                geojsonFeatires.push({
                    type: 'Feature',
                    properties: {
                        pointtype: 'end',
                        content: `Tour-End at: <b>${endTime.format('YYYY.MM.DD HH:mm:ss')}</b>`
                    },
                    geometry: {
                        type: 'Point',
                        coordinates: [end.longitude, end.latitude]
                    }
                });

                // build geojson object --------------------------------------------------------------------------------

                const geojsonObject = {
                    type: 'FeatureCollection',
                    crs: {
                        type: 'name',
                        properties: {
                            name: 'EPSG:4326'
                        }
                    },
                    features: geojsonFeatires
                };

                const geoJsonObj = new GeoJSON();
                const features = geoJsonObj.readFeatures(geojsonObject, {
                    featureProjection: 'EPSG:3857'
                });

                const vectorSource = new VectorSource({
                    features
                });

                const styleFunction = (feature: Feature): Style[] => {
                    const styles: Style[] = [];

                    const props = feature.getProperties() || {};

                    if (props.pointtype) {
                        switch (props.pointtype) {
                            // eslint-disable-next-line no-lone-blocks
                            case 'route': {
                                styles.push(new Style({
                                    stroke: new Stroke({
                                        width: 2
                                    }),
                                    fill: new Fill({
                                        color: 'rgba(255,0,0,0.5)'
                                    })
                                }));
                            } break;

                            // eslint-disable-next-line no-lone-blocks
                            case 'route_odontoceti': {
                                styles.push(new Style({
                                    stroke: new Stroke({
                                        width: 10,
                                        color: '#85C1E9'
                                    })
                                }));
                            } break;

                            // eslint-disable-next-line no-lone-blocks
                            case 'route_mysticeti': {
                                styles.push(new Style({
                                    stroke: new Stroke({
                                        width: 10,
                                        color: '#2471A3'
                                    })
                                }));
                            } break;

                            // eslint-disable-next-line no-lone-blocks
                            case 'start': {
                                styles.push(new Style({
                                    image: new Circle({
                                        radius: 7,
                                        fill: new Fill({color: '#69e356'}),
                                        stroke: new Stroke({
                                            color: 'black',
                                            width: 1
                                        })
                                    })
                                }));
                            } break;

                            // eslint-disable-next-line no-lone-blocks
                            case 'end': {
                                styles.push(new Style({
                                    image: new Circle({
                                        radius: 7,
                                        fill: new Fill({color: 'red'}),
                                        stroke: new Stroke({
                                            color: 'black',
                                            width: 1
                                        })
                                    })
                                }));
                            } break;

                            case 'boat': {
                                const pstart = props.start as number[];
                                const pend = props.end as number[];

                                const dx = pend[0] - pstart[0];
                                const dy = pend[1] - pstart[1];
                                const rotation = Math.atan2(dy, dx);

                                styles.push(new Style({
                                    geometry: new Point(fromLonLat(pstart)),
                                    image: new Icon({
                                        src: 'images/boat.png',
                                        anchor: [0.75, 0.5],
                                        rotateWithView: false,
                                        rotation: -rotation,
                                        size: [752, 752],
                                        scale: 0.08
                                    })
                                }));
                            } break;

                            // eslint-disable-next-line no-lone-blocks
                            case 'mysticeti': {
                                styles.push(new Style({
                                    image: new Icon({
                                        src: 'images/marker-mysticeti.png',
                                        rotateWithView: false,
                                        size: [500, 500],
                                        scale: 0.1
                                    })
                                }));
                            } break;

                            // eslint-disable-next-line no-lone-blocks
                            case 'odontoceti': {
                                styles.push(new Style({
                                    image: new Icon({
                                        src: 'images/marker-odontoceti.png',
                                        rotateWithView: false,
                                        size: [500, 500],
                                        scale: 0.1
                                    })
                                }));
                            } break;

                            // eslint-disable-next-line no-lone-blocks
                            case 'testudines': {
                                styles.push(new Style({
                                    image: new Icon({
                                        src: 'images/marker-testudines.png',
                                        rotateWithView: false,
                                        size: [500, 500],
                                        scale: 0.1
                                    })
                                }));
                            } break;
                        }
                    }


                    return styles;
                };

                const vectorLayer = new VectorLayer({
                    source: vectorSource,
                    style: styleFunction
                });

                this._map.addLayer(vectorLayer);

                // https://stackoverflow.com/questions/71305749/openlayers-linestring-round-corners

                console.log('Add vector line');
            }
        };

        this._onLoadTable();
    }

}