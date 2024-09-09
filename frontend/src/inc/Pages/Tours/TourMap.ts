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
import {Coordinate} from 'ol/coordinate';
import {fromLonLat} from 'ol/proj';
import {Organization as OrganizationAPI} from '../../Api/Organization';
import {Species as SpeciesAPI, SpeciesEntry} from '../../Api/Species';
import {Tours as ToursAPI, ToursTrackingSightingExtended} from '../../Api/Tours';
import {User as UserAPI} from '../../Api/User';
import {GeolocationCoordinates} from '../../Types/GeolocationCoordinates';
import {UtilDistanceCoast} from '../../Utils/UtilDistanceCoast';
import {UtilLocation} from '../../Utils/UtilLocation';
import {SightingMap, SightingMapObjectType} from '../../Widget/SightingMap';
import {BasePage} from '../BasePage';
import {Tours} from '../Tours';

// declare const dc: any;

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
    extended: ToursTrackingSightingExtended[];
};

export class ToursMap extends BasePage {

    /**
     * page name
     * @protected
     */
    protected override _name: string = 'tour_map';

    /**
     * Tour id
     * @protected
     */
    protected _tourId: number;

    /**
     * Map widget
     * @protected
     */
    protected _smap: SightingMap | null = null;

    /**
     * Badge menu item
     * @protected
     */
    protected _badge: SidebarMenuItemBadge|null = null;

    /**
     * constructor
     * @param {number} tourId
     */
    public constructor(tourId: number) {
        super();
        this._tourId = tourId;
    }

    /**
     * unload content
     */
    public override async unloadContent(): Promise<void> {
        if (this._smap) {
            this._smap.disposePopover(true);
            this._smap.unload();
            this._smap = null;
        }
    }

    /**
     * loadContent
     */
    public override async loadContent(): Promise<void> {
        const menuItem = this._wrapper.getMainSidebar().getSidebar().getMenu().getMenuItem(Tours.NAME);
        let menuTree: SidebarMenuTree|null = null;

        const title = `Tour #${this._tourId}`;

        if (menuItem !== null) {
            menuTree = new SidebarMenuTree(menuItem);
            const pmenuItem = new SidebarMenuItem(menuTree, true);
            pmenuItem.setTitle(title);
            pmenuItem.setActiv(true);

            this._badge = new SidebarMenuItemBadge(pmenuItem);
            this._badge.setContent('0');
        }

        const row1 = new ContentRow(this._wrapper.getContentWrapper().getContent());
        const card = new Card(new ContentCol(row1, ContentColSize.col12));

        card.setTitle(title);

        // map ---------------------------------------------------------------------------------------------------------

        this._smap = new SightingMap(card.getBodyElement());

        const wHeight = jQuery(window).height();

        if (wHeight) {
            this._smap.setHeight(wHeight - 220);
        }

        const currentuser = await UserAPI.getUserInfo();

        let viewCenter: Coordinate|null = null;

        if (currentuser && currentuser.organization) {
            viewCenter = fromLonLat([
                parseFloat(currentuser.organization.lon),
                parseFloat(currentuser.organization.lat)
            ]);
        }

        // load table --------------------------------------------------------------------------------------------------

        this._onLoadTable = async(): Promise<void> => {
            if (this._smap) {
                this._smap.load({
                    useHeatmap: false,
                    useBathymetriemap: true
                });

                this._smap.setView(viewCenter);
            }

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
                const org = await OrganizationAPI.getOrganization(trackingData.org_id);

                if (org) {
                    const orgViewCenter = fromLonLat([
                        parseFloat(org.lon),
                        parseFloat(org.lat)
                    ]);

                    if (this._smap) {
                        this._smap.setView(orgViewCenter);
                    }
                }

                const trackDate = moment(trackingData.date?.split(' ')[0]);

                card.setTitle(`${title} - <b>${trackDate.format('YYYY.MM.DD')}</b> - begin: ${trackingData.start} end: ${trackingData.end}`);

                const positionSort = new Map<number, GeolocationCoordinates>();
                const sighPostionTrack = new Map<number, TourSightingData>();

                // add sightings ---------------------------------------------------------------------------------------

                if (trackingData.sightings.length > 0) {
                    if (this._badge) {
                        this._badge.setContent(trackingData.sightings.length);
                    }
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
                        files: sighting.files,
                        extended: sighting.extended
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
                let start: GeolocationCoordinates|null = null;
                let end: GeolocationCoordinates|null = null;

                for (const [timestamp, value] of positionListObj) {
                    if (index === 0) {
                        start = value;
                    }

                    if (value.longitude && value.latitude) {
                        // hold point for sighting ---------------------------------------------------------------------

                        for (const [sightingid, sighting] of sighPostionTrack) {
                            if (timestamp >= sighting.timestamp_start && timestamp <= sighting.timestamp_end) {
                                sighting.points.push([value.longitude, value.latitude]);
                            }

                            sighPostionTrack.set(sightingid, sighting);
                        }

                        // add coord -----------------------------------------------------------------------------------

                        coordList.push([value.longitude, value.latitude]);

                        // add boat direction --------------------------------------------------------------------------
                        if (index > 0 && (index % 400 === 0) && end) {
                            if (this._smap) {
                                this._smap.addRawObject({
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
                        }

                        end = value;
                        index++;
                    }
                }

                // create track for sighting ---------------------------------------------------------------------------

                for (const [sightingId, sighting] of sighPostionTrack) {
                    if (!sighting.points || !sighting.points[0] || (sighting.points[0].length !== 2)) {
                        // eslint-disable-next-line no-continue
                        continue;
                    }

                    if (this._smap) {
                        this._smap.addRawObject({
                            type: 'Feature',
                            properties: {
                                pointtype: `route_${sighting.pointtype}`
                            },
                            geometry: {
                                type: 'LineString',
                                coordinates: sighting.points
                            }
                        });
                    }

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
                        images += `<br><img width="200px" src="/json/sightings/getimage/${sightingId}/${file}" alt="${file}">`;
                    }

                    let speStartTimeStr = 'unknown';

                    if (sighting.timestamp_start) {
                        const speStartTime = moment(sighting.timestamp_start);
                        speStartTimeStr = speStartTime.format('YYYY.MM.DD HH:mm:ss');
                    }

                    let extendedStr = '';

                    for (const extended of sighting.extended) {
                        switch (extended.name) {
                            case 'depth_contour':
                                extendedStr += `<b>Sea depth</b>: ${extended.data} m<br>`;
                                break;
                        }
                    }

                    if (this._smap) {
                        this._smap.addSighting(
                            sighting.pointtype,
                            sightingId,
                            `<b>Species</b>: ${speciesName}<br>` +
                            `<b>Group-Size</b>: ${sighting.species_count}<br>` +
                            `<b>Distance (Miles)</b>: ${UtilDistanceCoast.meterToM(floatDistance, true)}<br>` +
                            `<b>Date/Time</b>: ${speStartTimeStr}<br>` +
                            `<b>Position</b>: ${latStr} - ${lonStr}<br>${images}<br>` +
                            `${extendedStr}`,
                            sighting.points[0]
                        );
                    }
                }

                // add line routes -------------------------------------------------------------------------------------

                if (this._smap) {
                    this._smap.addLineRoute(coordList);
                }

                // add start -------------------------------------------------------------------------------------------

                if (start && this._smap && start.longitude && start.latitude) {
                    const startTime = moment(start.timestamp);

                    this._smap.addSighting(
                        SightingMapObjectType.Start,
                        'start',
                        `Tour-Start at: <b>${startTime.format('YYYY.MM.DD HH:mm:ss')}</b>`,
                        [start.longitude, start.latitude]
                    );
                }

                // add end ---------------------------------------------------------------------------------------------

                if (end && this._smap && end.longitude && end.latitude) {
                    const endTime = moment(end.timestamp);

                    this._smap.addSighting(
                        SightingMapObjectType.End,
                        'end',
                        `Tour-End at: <b>${endTime.format('YYYY.MM.DD HH:mm:ss')}</b>`,
                        [end.longitude, end.latitude]
                    );
                }

                // build geojson object --------------------------------------------------------------------------------

                if (this._smap !== null) {
                    // this._smap.addRawObject(geojsonFeatires);
                    await this._smap.refrech();
                }
            }
        };

        this._onLoadTable();
    }

}