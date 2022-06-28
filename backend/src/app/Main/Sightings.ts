import {Body, JsonController, Post, Session} from 'routing-controllers';
import {Sighting as SightingDB} from '../../inc/Db/MariaDb/Entity/Sighting';
import {SightingTour as SightingTourDB} from '../../inc/Db/MariaDb/Entity/SightingTour';
import {MariaDbHelper} from '../../inc/Db/MariaDb/MariaDbHelper';

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
export type SightingsEntry = {
    id: number;
    creater_id: number;
    create_datetime: number;
    update_datetime: number;
    sighting_tour_id: number;
    sigthing_datetime: number;
    sighting_schema_id: number;
    species_id: number;
    individual_count: number;
    behavioural_states_id: number;
    observer: string;
    other_vehicle_count: number;
    direction_id: number;
    swell_id: number;
    encounter_categorie_id: number;
    location_lat: number;
    location_lon: number;
    location_gps_n: string;
    location_gps_w: string;
    notes: string;
    tour_start_date: number;
    tour_end_date: number;
    vehicle_id: number;
    vehicle_driver_id: number;
};

/**
 * SightingsResponse
 */
export type SightingsResponse = {
    status: string;
    error?: string;
    filter?: SightingsFilter;
    offset: number;
    count: number;
    list: SightingsEntry[];
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
    public async getList(
        @Body() filter: SightingsFilter,
        @Session() session: any
    ): Promise<SightingsResponse> {
        let status = 'ok';
        let errormsg = '';
        let count = 0;
        const rlist: SightingsEntry[] = [];

        if ((session.user !== undefined) && session.user.isLogin) {
            count = await MariaDbHelper.getConnection()
            .getRepository(SightingDB).count();

            const sightings = await MariaDbHelper.getConnection()
            .getRepository(SightingDB)
            .createQueryBuilder('sighting')
            .leftJoinAndSelect(
                SightingTourDB,
                'sighting_tour',
                'sighting.sighting_tour_id = sighting_tour.id'
            )
            .orderBy('sighting.sigthing_datetime', 'DESC')
            .limit(filter.limit)
            .offset(filter.offset)
            .getRawMany();

            if (sightings) {
                for (const entry of sightings) {
                    rlist.push({
                        id: entry.sighting_id,
                        creater_id: entry.sighting_creater_id,
                        create_datetime: entry.sighting_create_datetime,
                        update_datetime: entry.sighting_update_datetime,
                        sighting_tour_id: entry.sighting_sighting_tour_id,
                        sigthing_datetime: entry.sighting_sigthing_datetime,
                        sighting_schema_id: entry.sighting_sighting_schema_id,
                        species_id: entry.sighting_species_id,
                        individual_count: entry.sighting_individual_count,
                        behavioural_states_id: entry.sighting_behavioural_states_id,
                        observer: entry.sighting_observer,
                        other_vehicle_count: entry.sighting_other_vehicle_count,
                        direction_id: entry.sighting_direction_id,
                        swell_id: entry.sighting_swell_id,
                        encounter_categorie_id: entry.sighting_encounter_categorie_id,
                        location_lat: entry.sighting_location_lat,
                        location_lon: entry.sighting_location_lon,
                        location_gps_n: entry.sighting_location_gps_n,
                        location_gps_w: entry.sighting_location_gps_w,
                        notes: entry.sighting_notes,
                        tour_start_date: entry.sighting_tour_start_date,
                        tour_end_date: entry.sighting_tour_end_date,
                        vehicle_id: entry.sighting_tour_vehicle_id,
                        vehicle_driver_id: entry.sighting_tour_vehicle_driver_id
                    });
                }
            }
        } else {
            status = 'error';
            errormsg = 'Please login!';
        }

        return {
            status,
            error: errormsg,
            filter,
            count,
            offset: filter.offset ? filter.offset : 0,
            list: rlist
        };
    }

}