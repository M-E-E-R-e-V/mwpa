import {NetFetch} from '../Net/NetFetch';
import {UnauthorizedError} from './Error/UnauthorizedError';
import {StatusCodes} from './Status/StatusCodes';
import {DefaultReturn} from './Types/DefaultReturn';

/**
 * SightingsFilter
 */
export type SightingsFilter = {
    order?: {
        id: string;
        tour_id: string;
        date: string;
        tour_start: string;
        create_datetime: string;
        update_datetime: string;
    };
    limit?: number;
    offset?: number;
};

/**
 * SightingsEntry
 */
export type SightingsEntry = {
    id: number;
    creater_id: number;
    creater_name: string;
    create_datetime: number;
    update_datetime: number;
    device_id: number;
    tour_id: number;
    tour_fid: string;
    hash: string;
    hash_import_count: number;
    source_import_file: string;
    unid?: string;
    vehicle_id?: number;
    vehicle_driver_id?: number;
    beaufort_wind?: string;
    date?: string;
    tour_start?: string;
    tour_end?: string;
    duration_from?: string;
    duration_until?: string;
    location_begin?: string;
    location_end?: string;
    photo_taken?: number;
    distance_coast?: string;
    distance_coast_estimation_gps?: number;
    species_id?: number;
    species_count?: number;
    juveniles?: number;
    calves?: number;
    newborns?: number;
    behaviours?: string;
    subgroups?: number;
    reaction_id?: number;
    freq_behaviour?: string;
    recognizable_animals?: string;
    other_species?: string;
    other?: string;
    other_vehicle?: string;
    note?: string;
    organization_id?: number;
    files: string[];
};

/**
 * SightingsResponse
 */
export type SightingsResponse = DefaultReturn & {
    filter?: SightingsFilter;
    offset: number;
    count: number;
    list: SightingsEntry[];
};

/**
 * SightingDeleteRequest
 */
export type SightingDeleteRequest = {
    id: number;
    description: string;
};

/**
 * Sightings
 */
export class Sightings {

    /**
     * getList
     */
    public static async getList(filter?: SightingsFilter): Promise<SightingsResponse|null> {
        let data = {};

        if (filter) {
            data = filter;
        }

        const result = await NetFetch.postData('/json/sightings/list', data);

        if (result && result.statusCode) {
            switch (result.statusCode) {
                case StatusCodes.OK:
                    return result as SightingsResponse;

                case StatusCodes.UNAUTHORIZED:
                    throw new UnauthorizedError();
            }
        }

        return null;
    }

    /**
     * delete
     * @param sighting
     */
    public static async delete(sighting: SightingDeleteRequest): Promise<boolean> {
        const result = await NetFetch.postData('/json/sightings/delete', sighting);

        if (result && result.statusCode) {
            switch (result.statusCode) {
                case StatusCodes.OK:
                    return true;

                case StatusCodes.UNAUTHORIZED:
                    throw new UnauthorizedError();
            }
        }

        return false;
    }

}