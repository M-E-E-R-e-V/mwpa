import {NetFetch} from '../Net/NetFetch';

/**
 * SightingsFilter
 */
export type SightingsFilter = {
    year?: number;
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
    location_gps_e: string;
    notes: string;
    tour_start_date: number;
    tour_end_date: number;
    vehicle_id: number;
};

/**
 * SightingsResponse
 */
export type SightingsResponse = {
    status: string;
    error?: string;
    filter?: SightingsFilter;
    index: number;
    offset: number;
    count: number;
    list: SightingsEntry[];
};

/**
 * Sightings
 */
export class Sightings {

    /**
     * getList
     */
    public static async getList(): Promise<SightingsResponse|null> {
        const response = await NetFetch.postData('/json/sightings/list', {});

        if (response) {
            if (response.status === 'ok') {
                return response;
            }
        }

        return null;
    }

}