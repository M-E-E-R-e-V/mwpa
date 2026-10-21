import fs from 'fs';
import {StatusCodes} from 'figtree-schemas';
import {FindOptionsOrder} from 'typeorm';
import {SightingsEntry, SightingsFilter, SightingsListResponse} from 'mwpa_schemas';
import {Sighting as SightingDB} from '../../../Db/MariaDb/Entities/Sighting.js';
import {SightingOld} from '../../../Db/MariaDb/Entities/SightingOld.js';
import {SightingMovementRepository} from '../../../Db/MariaDb/Repositories/SightingMovementRepository.js';
import {SightingOldRepository} from '../../../Db/MariaDb/Repositories/SightingOldRepository.js';
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
     * Paginated sighting list. Non-admins see only sightings from their organizations;
     * the optional filter fields (period, species, vehicle, driver, organization, free-text)
     * are AND-combined on top.
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
        // The combined "show old data" view can't honour vehicle/driver
        // filters (old hand-data has no vehicle), so only take that path when
        // neither is set.
        const includeOld = filter?.include_old === true
            && (filter.vehicle_id === undefined || filter.vehicle_id === 0)
            && (filter.vehicle_driver_id === undefined || filter.vehicle_driver_id === 0);

        if (includeOld) {
            return List._getCombinedList(userId, isAdmin, filter);
        }

        const order = List._buildOrder(filter);

        const orgIds = isAdmin ? undefined : await Users.getOrganizationIds(userId);
        const {rows, count} = await SightingRepository.getInstance().findActiveList(
            order,
            filter?.offset,
            filter?.limit,
            orgIds,
            {
                period_from: filter?.period_from,
                period_to: filter?.period_to,
                species_id: filter?.species_id,
                organization_id: filter?.organization_id,
                vehicle_id: filter?.vehicle_id,
                vehicle_driver_id: filter?.vehicle_driver_id,
                search: filter?.search
            }
        );

        const list = await List._appEntries(rows);

        return {
            statusCode: StatusCodes.OK,
            filter,
            count,
            offset: filter?.offset ?? 0,
            list
        };
    }

    /**
     * Combined app + historical ("old data") list page, merged by date in one
     * UNION so interleaved rows paginate correctly. Each row keeps its origin
     * via the `is_old` flag.
     * @param {number} userId
     * @param {boolean} isAdmin
     * @param {SightingsFilter} filter
     * @return {SightingsListResponse}
     */
    private static async _getCombinedList(
        userId: number,
        isAdmin: boolean,
        filter?: SightingsFilter
    ): Promise<SightingsListResponse> {
        const orgIds = isAdmin ? undefined : await Users.getOrganizationIds(userId);
        const skip = filter?.offset ?? 0;
        const take = filter?.limit ?? 50;

        const {keys, count} = await SightingRepository.getInstance().findCombinedPage(
            skip,
            take,
            orgIds,
            {
                period_from: filter?.period_from,
                period_to: filter?.period_to,
                species_id: filter?.species_id,
                search: filter?.search
            }
        );

        const appIds = keys.filter((k) => !k.isOld).map((k) => k.id);
        const oldIds = keys.filter((k) => k.isOld).map((k) => k.id);

        const [appRows, oldRows] = await Promise.all([
            SightingRepository.getInstance().findManyByIds(appIds),
            SightingOldRepository.getInstance().findManyByIds(oldIds)
        ]);

        const appById = new Map((await List._appEntries(appRows)).map((e) => [e.id, e]));
        const oldById = new Map((await List._oldEntries(oldRows)).map((e) => [e.id, e]));

        const list: SightingsEntry[] = [];
        for (const key of keys) {
            const entry = key.isOld ? oldById.get(key.id) : appById.get(key.id);
            if (entry !== undefined) {
                list.push(entry);
            }
        }

        return {
            statusCode: StatusCodes.OK,
            filter,
            count,
            offset: skip,
            list
        };
    }

    /**
     * Enrich app `sighting` rows into list entries (species, movement track
     * count, image files, creator name). is_old = false.
     * @param {SightingDB[]} rows
     * @return {SightingsEntry[]}
     */
    private static async _appEntries(rows: SightingDB[]): Promise<SightingsEntry[]> {
        const speciesList = await SpeciesList.getSpeciesList();
        const speciesMap = new Map<number, typeof speciesList[number]>();
        for (const species of speciesList) {
            speciesMap.set(species.id, species);
        }

        // Bulk-load movement headers for the rows in this page so the list UI
        // can show "N track points" under each row's location without a second
        // round-trip per row. Every entry gets a count — 0 means either no
        // movement row at all or only hand-entered begin/end anchors (source
        // = 'manual_begin_end'), so the UI can flag those rows explicitly
        // instead of silently omitting the value.
        const movements = await SightingMovementRepository.getInstance()
            .findManyBySightings(rows.map((r) => r.id));
        const trackPointCountBySighting = new Map<number, number>();
        for (const m of movements) {
            const count = m.source === 'tracking' && m.segment_count > 0
                ? m.segment_count + 1
                : 0;
            trackPointCountBySighting.set(m.sighting_id, count);
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
                species_name: speciesName,
                track_point_count: trackPointCountBySighting.get(entry.id) ?? 0,
                is_old: false
            });
        }

        return list;
    }

    /**
     * Map historical `sighting_old` rows into list entries. is_old = true,
     * read-only in the UI: no images / creator / movement; the raw species
     * string fills in when the species couldn't be resolved.
     * @param {SightingOld[]} rows
     * @return {SightingsEntry[]}
     */
    private static async _oldEntries(rows: SightingOld[]): Promise<SightingsEntry[]> {
        const speciesList = await SpeciesList.getSpeciesList();
        const speciesMap = new Map<number, typeof speciesList[number]>();
        for (const species of speciesList) {
            speciesMap.set(species.id, species);
        }

        return rows.map((entry) => {
            const species = speciesMap.get(entry.species_id);
            const pointtype = species?.species_group
                ? species.species_group.name.toLowerCase()
                : 'none';
            const speciesName = species ? '' : entry.species_name_raw;
            const beaufortWind = entry.beaufort_wind_n === ''
                ? `${entry.beaufort_wind}`
                : entry.beaufort_wind_n;

            return {
                id: entry.id,
                unid: entry.unid,
                creater_id: 0,
                creater_name: '',
                create_datetime: entry.create_datetime,
                update_datetime: entry.update_datetime,
                device_id: 0,
                vehicle_id: 0,
                vehicle_driver_id: 0,
                beaufort_wind: beaufortWind,
                date: entry.date,
                tour_id: 0,
                tour_fid: '',
                tour_start: entry.tour_start,
                tour_end: entry.tour_end,
                duration_from: entry.duration_from,
                duration_until: entry.duration_until,
                location_begin: entry.location_begin ?? '',
                location_end: entry.location_end ?? '',
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
                hash: '',
                hash_import_count: 0,
                source_import_file: entry.source_file,
                organization_id: 0,
                files: [],
                pointtype,
                species_name: speciesName,
                track_point_count: 0,
                is_old: true
            };
        });
    }

}