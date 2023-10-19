import fs from 'fs';
import {Body, JsonController, Post, Session} from 'routing-controllers';
import {Sighting as SightingDB} from '../../inc/Db/MariaDb/Entity/Sighting';
import {SightingTour as SightingTourDB} from '../../inc/Db/MariaDb/Entity/SightingTour';
import {SightingTourTracking as SightingTourTrackingDB} from '../../inc/Db/MariaDb/Entity/SightingTourTracking';
import {MariaDbHelper} from '../../inc/Db/MariaDb/MariaDbHelper';
import {DefaultReturn} from '../../inc/Routes/DefaultReturn';
import {StatusCodes} from '../../inc/Routes/StatusCodes';
import {UtilImageUploadPath} from '../../inc/Utils/UtilImageUploadPath';
import {Species, SpeciesEntry} from './Species';

/**
 * ToursFilter
 */
export type ToursFilter = {
    year?: number;
    limit?: number;
    offset?: number;
};

/**
 * TourEntry
 */
export type TourEntry = {
    id: number;
    tour_fid: string;
    creater_id: number;
    create_datetime: number;
    update_datetime: number;
    vehicle_id: number;
    vehicle_driver_id: number;
    beaufort_wind: string;
    date: string;
    tour_start: string;
    tour_end: string;
    organization_id: number;
    status: number;
    record_by_persons: string;
    count_sightings: number;
    count_trackings: number;
};

/**
 * ToursResponse
 */
export type ToursResponse = DefaultReturn & {
    filter?: ToursFilter;
    offset?: number;
    count?: number;
    list?: TourEntry[];
};

/**
 * ToursTrackingRequest
 */
export type ToursTrackingRequest = {
    tour_id: number;
};

export type ToursTrackingSightingData = {
    id: number;
    location_begin: string;
    location_end: string;
    pointtype: string;
    species_id: number;
    species_name: string;
    species_count: number;
    distance_coast: string;
    files: string[];
};

export type ToursTrackingData = {
    date: string;
    start: string;
    end: string;
    positions: string[];
    sightings: ToursTrackingSightingData[];
};

export type ToursTrackingResponse = DefaultReturn & {
    tracking?: ToursTrackingData;
};

/**
 * Tours
 */
@JsonController()
export class Tours {

    /**
     * turtles
     * @protected
     */
    protected _turtles: string[] = [
        'Caretta caretta',
        'Dermochelys coriacea',
        'Chelonia mydas',
        'Eretmochelys imbricata',
        'Unknown sea turtle',
        'Eretmochelys imbricata - Hawksbill sea turtle',
        'Chelonia mydas - Green sea turtle',
        'Dermochelys coriacea - Leatherback sea turtle',
        'Caretta caretta - Loggerhead sea turtle'
    ];

    /**
     * getList
     * @param filter
     * @param session
     */
    @Post('/json/tours/list')
    public async getList(@Body() filter: ToursFilter, @Session() session: any): Promise<ToursResponse> {
        if ((session.user !== undefined) && session.user.isLogin) {
            const tourRepository = MariaDbHelper.getConnection().getRepository(SightingTourDB);
            const sightingRepository = MariaDbHelper.getConnection().getRepository(SightingDB);
            const tourTrackRepository = MariaDbHelper.getConnection().getRepository(SightingTourTrackingDB);

            const list: TourEntry[] = [];
            const count = await tourRepository.count();
            const dblist = await tourRepository.find({
                order: {
                    date: 'DESC',
                    tour_start: 'DESC'
                },
                skip: filter.offset,
                take: filter.limit
            });

            for (const entry of dblist) {
                const countSigh = await sightingRepository.count({
                    where: {
                        tour_fid: entry.tour_fid
                    }
                });

                const countTrack = await tourTrackRepository.count({
                    where: {
                        sighting_tour_id: entry.id
                    }
                });

                list.push({
                    id: entry.id,
                    tour_fid: entry.tour_fid,
                    creater_id: entry.creater_id,
                    create_datetime: entry.create_datetime,
                    update_datetime: entry.update_datetime,
                    vehicle_id: entry.vehicle_id,
                    vehicle_driver_id: entry.vehicle_driver_id,
                    beaufort_wind: entry.beaufort_wind,
                    date: entry.date,
                    tour_start: entry.tour_start,
                    tour_end: entry.tour_end,
                    organization_id: entry.organization_id,
                    status: entry.status,
                    record_by_persons: entry.record_by_persons,
                    count_sightings: countSigh,
                    count_trackings: countTrack
                });
            }

            return {
                statusCode: StatusCodes.OK,
                filter,
                count,
                offset: filter.offset ? filter.offset : 0,
                list
            };
        }

        return {
            statusCode: StatusCodes.UNAUTHORIZED
        };
    }

    /**
     * getTrackingList
     * @param request
     * @param session
     */
    @Post('/json/tours/tracking/list')
    public async getTrackingList(@Body() request: ToursTrackingRequest, @Session() session: any): Promise<ToursTrackingResponse> {
        if ((session.user !== undefined) && session.user.isLogin) {
            const tourRepository = MariaDbHelper.getConnection().getRepository(SightingTourDB);
            const tourTrackRepository = MariaDbHelper.getConnection().getRepository(SightingTourTrackingDB);
            const sightingRepository = MariaDbHelper.getConnection().getRepository(SightingDB);

            const tour = await tourRepository.findOne({where: {id: request.tour_id}});

            if (tour) {
                const tracks = await tourTrackRepository.find({
                    where: {
                        sighting_tour_id: tour.id
                    }
                });

                const positionList: string[] = [];

                for (const track of tracks) {
                    positionList.push(track.position);
                }

                const sightList: ToursTrackingSightingData[] = [];

                const sightings = await sightingRepository.find({
                    where: {
                        tour_fid: tour.tour_fid
                    }
                });

                const speciesList = await Species.getSpeciesList();
                const speciesMap = new Map<number, SpeciesEntry>();

                for (const species of speciesList) {
                    speciesMap.set(species.id, species);
                }

                for (const sighting of sightings) {
                    const species = speciesMap.get(sighting.species_id);
                    let pointtype = 'none';
                    let speciesName = '';

                    if (species) {
                        if (species.species_group) {
                            pointtype = species.species_group?.name.toLowerCase();
                        }
                    } else if (sighting.other) {
                        if (this._turtles.includes(sighting.other?.trim())) {
                            pointtype = 'testudines';
                            speciesName = sighting.other;
                        }
                    }

                    let files: string[] = [];
                    const sightingUidDir = UtilImageUploadPath.getSightingDirector(sighting.unid);

                    if (sightingUidDir) {
                        const tfiles = fs.readdirSync(sightingUidDir);

                        if (tfiles) {
                            files = tfiles;
                        }
                    }

                    sightList.push({
                        id: sighting.id,
                        location_begin: sighting.location_begin,
                        location_end: sighting.location_end,
                        pointtype,
                        species_id: sighting.species_id,
                        species_name: speciesName,
                        species_count: sighting.species_count,
                        distance_coast: sighting.distance_coast,
                        files
                    });
                }

                return {
                    statusCode: StatusCodes.OK,
                    tracking: {
                        date: tour.date,
                        start: tour.tour_start,
                        end: tour.tour_end,
                        positions: positionList,
                        sightings: sightList
                    }
                };
            }

            return {
                statusCode: StatusCodes.INTERNAL_ERROR,
                msg: 'Tour not found by ID!'
            };
        }

        return {
            statusCode: StatusCodes.UNAUTHORIZED
        };
    }

}