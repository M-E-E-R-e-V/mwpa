import fs from 'fs';
import {StatusCodes} from 'figtree-schemas';
import {FindOptionsOrder} from 'typeorm';
import {SightingsEntry, SightingsFilter, SightingsListResponse} from 'mwpa_schemas';
import {Sighting as SightingDB} from '../../../Db/MariaDb/Entities/Sighting.js';
import {SightingRepository} from '../../../Db/MariaDb/Repositories/SightingRepository.js';
import {UserRepository} from '../../../Db/MariaDb/Repositories/UserRepository.js';
import {Users} from '../../../Users/Users.js';
import {UtilTurtleList} from '../../../Utils/UtilTurtleList.js';
import {UtilUploadPath} from '../../../Utils/UtilUploadPath.js';
import {List as SpeciesList} from '../Species/List.js';

type SightingsOrder = NonNullable<SightingsFilter['order']>;
const ORDER_FIELDS: (keyof SightingsOrder)[] = [
    'date',
    'id',
    'tour_id',
    'tour_start',
    'create_datetime',
    'update_datetime'
];

/**
 * List
 */
export class List {

    /**
     * Build the typeorm `order` object from the request filter.
     * Empty strings mean "skip this field". Defaults to date+tour_start desc when no order given.
     */
    private static _buildOrder(filter?: SightingsFilter): FindOptionsOrder<SightingDB> {
        if (!filter?.order) {
            return {
                date: 'DESC',
                tour_start: 'DESC'
            };
        }

        const order: Record<string, 'ASC' | 'DESC'> = {};
        for (const field of ORDER_FIELDS) {
            const value = filter.order[field];
            if (value && value !== '') {
                order[field] = value.toLowerCase() === 'asc' ? 'ASC' : 'DESC';
            }
        }
        return order as FindOptionsOrder<SightingDB>;
    }

    /**
     * Paginated sighting list. Non-admins see only sightings from their organizations.
     * @param {number} userId
     * @param {boolean} isAdmin
     * @param {SightingsFilter} filter
     * @return {SightingsListResponse}
     */
    public static async getList(
        userId: number,
        isAdmin: boolean,
        filter?: SightingsFilter
    ): Promise<SightingsListResponse> {
        const order = List._buildOrder(filter);

        const orgIds = isAdmin ? undefined : await Users.getOrganizationIds(userId);
        const {rows, count} = await SightingRepository.getInstance().findActiveList(
            order,
            filter?.offset,
            filter?.limit,
            orgIds
        );

        const speciesList = await SpeciesList.getSpeciesList();
        const speciesMap = new Map<number, typeof speciesList[number]>();
        for (const species of speciesList) {
            speciesMap.set(species.id, species);
        }

        const createrCache = new Map<number, string>();
        const list: SightingsEntry[] = [];

        for (const entry of rows) {
            const species = speciesMap.get(entry.species_id);
            let pointtype = 'none';
            let speciesName = '';

            if (species) {
                if (species.species_group) {
                    pointtype = species.species_group.name.toLowerCase();
                }
            } else if (entry.other && UtilTurtleList.isTurtle(entry.other)) {
                pointtype = 'testudines';
                speciesName = entry.other;
            }

            const beaufortWind = entry.beaufort_wind_n !== ''
                ? entry.beaufort_wind_n
                : `${entry.beaufort_wind}`;

            let files: string[] = [];
            const sightingDir = await UtilUploadPath.getSightingDirectory(entry.unid);
            if (sightingDir) {
                try {
                    files = fs.readdirSync(sightingDir);
                } catch {
                    files = [];
                }
            }

            if (!createrCache.has(entry.creater_id)) {
                const createrUser = await UserRepository.getInstance().findOne(entry.creater_id);
                createrCache.set(entry.creater_id, createrUser?.username ?? 'unknown');
            }

            list.push({
                id: entry.id,
                unid: entry.unid,
                creater_id: entry.creater_id,
                creater_name: createrCache.get(entry.creater_id) ?? 'unknown',
                create_datetime: entry.create_datetime,
                update_datetime: entry.update_datetime,
                device_id: entry.device_id,
                vehicle_id: entry.vehicle_id,
                vehicle_driver_id: entry.vehicle_driver_id,
                beaufort_wind: beaufortWind,
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
                group_structure_id: entry.group_structure_id,
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
                organization_id: entry.organization_id,
                files,
                pointtype,
                species_name: speciesName
            });
        }

        return {
            statusCode: StatusCodes.OK,
            filter,
            count,
            offset: filter?.offset ?? 0,
            list
        };
    }

}