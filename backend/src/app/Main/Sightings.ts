import {Body, JsonController, Post, Session} from 'routing-controllers';
import {Sighting as SightingDB} from '../../inc/Db/MariaDb/Entity/Sighting';
import {MariaDbHelper} from '../../inc/Db/MariaDb/MariaDbHelper';
import {DefaultReturn} from '../../inc/Routes/DefaultReturn';
import {StatusCodes} from '../../inc/Routes/StatusCodes';
import {TypeSighting} from '../../inc/Types/TypeSighting';

/**
 * SightingsFilter
 */
export type SightingsFilter = {
    year?: number;
    limit?: number;
    offset?: number;
};

/**
 * SightingsEntry
 */
export type SightingsEntry = TypeSighting & {
    id: number;
    creater_id: number;
    create_datetime: number;
    update_datetime: number;
    device_id: number;
    tour_id: number;
    tour_fid: string;
    hash: string;
    hash_import_count: number;
    source_import_file: string;
    organization_id: number;
};

/**
 * SightingsResponse
 */
export type SightingsResponse = DefaultReturn & {
    filter?: SightingsFilter;
    offset?: number;
    count?: number;
    list?: SightingsEntry[];
};

/**
 * Sightings
 */
@JsonController()
export class Sightings {

    /**
     * getList
     * @param filter
     * @param session
     */
    @Post('/json/sightings/list')
    public async getList(@Body() filter: SightingsFilter, @Session() session: any): Promise<SightingsResponse> {
        if ((session.user !== undefined) && session.user.isLogin) {
            const sightingRepository = MariaDbHelper.getConnection().getRepository(SightingDB);

            const list: SightingsEntry[] = [];
            const count = await sightingRepository.count();
            const dblist = await sightingRepository.find({
                order: {
                    id: 'DESC'
                },
                skip: filter.offset,
                take: filter.limit
            });

            for (const entry of dblist) {
                list.push({
                    id: entry.id,
                    unid: entry.unid,
                    creater_id: entry.creater_id,
                    create_datetime: entry.create_datetime,
                    update_datetime: entry.update_datetime,
                    device_id: entry.device_id,
                    vehicle_id: entry.vehicle_id,
                    vehicle_driver_id: entry.vehicle_driver_id,
                    beaufort_wind: entry.beaufort_wind,
                    date: entry.date,
                    tour_id: entry.tour_id,
                    tour_fid: entry.tour_fid,
                    tour_start: entry.tour_start,
                    tour_end: entry.tour_end,
                    duration_from: entry.duration_from,
                    duration_until: entry.duration_until,
                    location_begin: entry.location_begin,
                    location_end: entry.location_end,
                    photo_taken: entry.photo_taken,
                    distance_coast: entry.distance_coast,
                    distance_coast_estimation_gps: entry.distance_coast_estimation_gps,
                    species_id: entry.species_id,
                    species_count: entry.species_count,
                    juveniles: entry.juveniles,
                    calves: entry.calves,
                    newborns: entry.newborns,
                    behaviours: entry.behaviours,
                    subgroups: entry.subgroups,
                    reaction_id: entry.reaction_id,
                    freq_behaviour: entry.freq_behaviour,
                    recognizable_animals: entry.recognizable_animals,
                    other_species: entry.other_species,
                    other: entry.other,
                    other_vehicle: entry.other_vehicle,
                    note: entry.note,
                    hash: entry.hash,
                    hash_import_count: entry.hash_import_count,
                    source_import_file: entry.source_import_file,
                    organization_id: entry.organization_id
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

}