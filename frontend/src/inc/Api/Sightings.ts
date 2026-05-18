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
    period_from?: string;
    period_to?: string;
    species_id?: number;
    organization_id?: number;
    vehicle_id?: number;
    vehicle_driver_id?: number;
    search?: string;
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
    pointtype?: string;
    species_name?: string;
    track_point_count?: number;
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
 * SightingSaveRequest
 */
export type SightingSaveRequest = {
    id: number;
    vehicle_id: number;
    vehicle_driver_id: number;
    beaufort_wind: string;
    date: string;
    tour_start?: string;
    tour_end?: string;
    duration_from?: string;
    duration_until?: string;
    location_begin: string;
    location_end?: string;
    species_id: number;
    species_count: number;
    reaction_id: number;
    other?: string;
    other_vehicle?: string;
    note?: string;
};

export type SightingGPSUpdateData = {
    notHaveLocation: number[];
    notHaveTimestamp: number[];
    haveSameDate: number[];
    newDate: number[];
};

export type SightingGPSUpdate = DefaultReturn & {
    data?: SightingGPSUpdateData;
};

/**
 * SightingWeather
 */
export type SightingWeather = {
    id: number;
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
     * save
     * @param sighting
     */
    public static async save(sighting: SightingSaveRequest): Promise<boolean> {
        const result = await NetFetch.postData('/json/sightings/save', sighting);

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

    /**
     * setDateByGPS
     */
    public static async setDateByGPS(): Promise<SightingGPSUpdateData|null> {
        const result = await NetFetch.getData('/json/sightings/setdatebygps');

        if (result && result.statusCode) {
            switch (result.statusCode) {
                case StatusCodes.OK:
                    return result.data as SightingGPSUpdateData;

                case StatusCodes.UNAUTHORIZED:
                    throw new UnauthorizedError();
            }
        }

        return null;
    }

    public static async getWeather(sighting: SightingWeather): Promise<void> {
        const result = await NetFetch.postData('/json/sightings/weather', sighting);

        console.log(result);
    }

    /**
     * Distinct calendar years (DESC) covered by non-deleted sightings.
     * Returns an empty array on any non-OK response (UNAUTHORIZED still throws).
     */
    public static async getYears(): Promise<number[]> {
        const result = await NetFetch.getData('/json/sightings/years');

        if (result && result.statusCode) {
            switch (result.statusCode) {
                case StatusCodes.OK:
                    return (result.years as number[] | undefined) ?? [];

                case StatusCodes.UNAUTHORIZED:
                    throw new UnauthorizedError();
            }
        }

        return [];
    }

}