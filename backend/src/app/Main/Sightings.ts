import moment from 'moment';
import xlsx from 'node-xlsx';
import fs from 'fs';
import Path from 'path';
import {Body, ContentType, Get, JsonController, Param, Post, Session} from 'routing-controllers';
import {BehaviouralStates as BehaviouralStatesDB} from '../../inc/Db/MariaDb/Entity/BehaviouralStates';
import {EncounterCategories as EncounterCategoriesDB} from '../../inc/Db/MariaDb/Entity/EncounterCategories';
import {Sighting as SightingDB} from '../../inc/Db/MariaDb/Entity/Sighting';
import {Species as SpeciesDB} from '../../inc/Db/MariaDb/Entity/Species';
import {User as UserDB} from '../../inc/Db/MariaDb/Entity/User';
import {Vehicle as VehicleDB} from '../../inc/Db/MariaDb/Entity/Vehicle';
import {VehicleDriver as VehicleDriverDB} from '../../inc/Db/MariaDb/Entity/VehicleDriver';
import {MariaDbHelper} from '../../inc/Db/MariaDb/MariaDbHelper';
import {Logger} from '../../inc/Logger/Logger';
import {DefaultReturn} from '../../inc/Routes/DefaultReturn';
import {StatusCodes} from '../../inc/Routes/StatusCodes';
import {TypeSighting} from '../../inc/Types/TypeSighting';
import {UtilDistanceCoast} from '../../inc/Utils/UtilDistanceCoast';
import {UtilImageUploadPath} from '../../inc/Utils/UtilImageUploadPath';
import {UtilPosition, UtilPositionToStr} from '../../inc/Utils/UtilPosition';
import {UtilSelect} from '../../inc/Utils/UtilSelect';

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
    files: string[];
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
 * SightingDeleteRequest
 */
export type SightingDeleteRequest = {
    id: number;
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
            session.sightingFilter = filter;

            const sightingRepository = MariaDbHelper.getConnection().getRepository(SightingDB);

            const list: SightingsEntry[] = [];
            const count = await sightingRepository.count();
            const dblist = await sightingRepository.find({
                order: {
                    date: 'DESC',
                    tour_start: 'DESC'
                },
                skip: filter.offset,
                take: filter.limit
            });

            for (const entry of dblist) {
                let beaufort_wind = entry.beaufort_wind_n;

                if (entry.beaufort_wind_n === '') {
                    beaufort_wind = `${entry.beaufort_wind}`;
                }

                let files: string[] = [];
                const sightingUidDir = UtilImageUploadPath.getSightingDirector(entry.unid);

                if (sightingUidDir) {
                    const tfiles = fs.readdirSync(sightingUidDir);

                    if (tfiles) {
                        files = tfiles;
                    }
                }

                list.push({
                    id: entry.id,
                    unid: entry.unid,
                    creater_id: entry.creater_id,
                    create_datetime: entry.create_datetime,
                    update_datetime: entry.update_datetime,
                    device_id: entry.device_id,
                    vehicle_id: entry.vehicle_id,
                    vehicle_driver_id: entry.vehicle_driver_id,
                    beaufort_wind,
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
                    organization_id: entry.organization_id,
                    files
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
     * getExcel
     * @param session
     */
    @Get('/json/sightings/list/excel')
    @ContentType('application/octet-stream')
    public async getExcel(@Session() session: any): Promise<Buffer | null> {
        if ((session.user !== undefined) && session.user.isLogin && session.user.isAdmin) {
            const filter = session.sightingFilter;
            const vehicles: Map<number, VehicleDB> = new Map<number, VehicleDB>();
            const drivers: Map<number, string> = new Map<number, string>();
            const species: Map<number, SpeciesDB> = new Map<number, SpeciesDB>();
            const behStates: Map<number, BehaviouralStatesDB> = new Map<number, BehaviouralStatesDB>();
            const groupStructure: Map<number, string> = new Map<number, string>();
            const enCats: Map<number, EncounterCategoriesDB> = new Map<number, EncounterCategoriesDB>();
            const users: Map<number, UserDB> = new Map<number, UserDB>();

            // repositories --------------------------------------------------------------------------------------------

            const sightingRepository = MariaDbHelper.getConnection().getRepository(SightingDB);
            const vehicleRepository = MariaDbHelper.getConnection().getRepository(VehicleDB);
            const speciesRepository = MariaDbHelper.getConnection().getRepository(SpeciesDB);
            const behStatesRepository = MariaDbHelper.getConnection().getRepository(BehaviouralStatesDB);
            const enCatRepository = MariaDbHelper.getConnection().getRepository(EncounterCategoriesDB);
            const userRepository = MariaDbHelper.getConnection().getRepository(UserDB);

            // vehicle list --------------------------------------------------------------------------------------------
            const dbVehicles = await vehicleRepository.find();

            if (dbVehicles) {
                for (const dbVehicle of dbVehicles) {
                    vehicles.set(dbVehicle.id, dbVehicle);
                }
            }

            // vehicle driver list -------------------------------------------------------------------------------------

            const dbDrivers = await MariaDbHelper.getConnection()
            .getRepository(VehicleDriverDB)
            .createQueryBuilder('vehicle_driver')
            .leftJoinAndSelect(
                UserDB,
                'user',
                'vehicle_driver.user_id = user.id'
            )
            .getRawMany();

            if (dbDrivers) {
                for (const dbDriver of dbDrivers) {
                    drivers.set(dbDriver.vehicle_driver_id, dbDriver.user_full_name);
                }
            }

            // species list --------------------------------------------------------------------------------------------

            const dbSpecies = await speciesRepository.find();

            if (dbSpecies) {
                for (const dbSpecie of dbSpecies) {
                    species.set(dbSpecie.id, dbSpecie);
                }
            }

            // users ---------------------------------------------------------------------------------------------------

            const dbUsers = await userRepository.find();

            if (dbUsers) {
                for (const dbUser of dbUsers) {
                    users.set(dbUser.id, dbUser);
                }
            }

            // behavioural states --------------------------------------------------------------------------------------

            const dbBehStates = await behStatesRepository.find();

            if (dbBehStates) {
                for (const dbBehState of dbBehStates) {
                    behStates.set(dbBehState.id, dbBehState);
                }
            }

            // groupStructure ------------------------------------------------------------------------------------------

            groupStructure.set(1, 'widely dispersed');
            groupStructure.set(2, 'dispersed');
            groupStructure.set(3, 'loose');
            groupStructure.set(4, 'tight');

            // reaction ------------------------------------------------------------------------------------------------

            const dbCates = await enCatRepository.find();

            if (dbCates) {
                for (const dbCate of dbCates) {
                    enCats.set(dbCate.id, dbCate);
                }
            }

            // excel header --------------------------------------------------------------------------------------------

            const data: any[] = [
                [
                    'Id',
                    'Date',
                    'Start of trip',
                    'End of trip',
                    'Boat',
                    'Skipper',
                    'Observer',
                    'Wind/Seastate (Beaufort)',
                    'Species',
                    'Number of animals',
                    'Duration from',
                    'Duration until',
                    'Position begin latitude',
                    'Position begin longitude',
                    'Position end latitude',
                    'Position end longitude',
                    'Estimation without GPS',
                    'Distance to nearst coast (nm)',
                    'Juveniles',
                    'Calves',
                    'Newborns',
                    'Behaviour',
                    'Group structure',
                    'Subgroups',
                    'Reaction',
                    'Frequent behaviours of individuals',
                    'Photos taken',
                    'Recognizable animals',
                    'Other species',
                    'Other',
                    'Other boats present',
                    'Note'
                ]
            ];

            if (filter) {
                const dblist = await sightingRepository.find({
                    order: {
                        date: 'DESC',
                        tour_start: 'DESC'
                    }
                });

                if (dblist) {
                    for (const entry of dblist) {
                        let vehicleStr = '';
                        let vehicleDriverStr = '';
                        let userStr = '';
                        let specieStr = '';
                        let behaviourStr = '';
                        let groupStructrStr = '';
                        let reactionStr = '';
                        let freqStr = '';
                        let otherSpeciesStr = '';

                        // vehicle -------------------------------------------------------------------------------------
                        const vehicle = vehicles.get(entry.vehicle_id);

                        if (vehicle) {
                            vehicleStr = vehicle.description;
                        }

                        // vehicle driver ------------------------------------------------------------------------------

                        const driver = drivers.get(entry.vehicle_driver_id);

                        if (driver) {
                            vehicleDriverStr = driver;
                        }

                        // observer ------------------------------------------------------------------------------------

                        const user = users.get(entry.creater_id);

                        if (user) {
                            userStr = user.full_name;
                        }

                        // date ----------------------------------------------------------------------------------------

                        const date = moment(entry.date);

                        // position ------------------------------------------------------------------------------------

                        const positionBeginLat = UtilPosition.getStr(entry.location_begin, UtilPositionToStr.LatDec);
                        const positionBeginLon = UtilPosition.getStr(entry.location_begin, UtilPositionToStr.LonDec);
                        const positionEndLat = UtilPosition.getStr(entry.location_end, UtilPositionToStr.LatDec);
                        const positionEndLon = UtilPosition.getStr(entry.location_end, UtilPositionToStr.LonDec);

                        // distance ------------------------------------------------------------------------------------
                        const distance = UtilDistanceCoast.meterToM(parseFloat(entry.distance_coast) || 0.0, true);

                        // speceie -------------------------------------------------------------------------------------

                        const specie = species.get(entry.species_id);

                        if (specie) {
                            specieStr = specie.name.split(',')[0];
                        }

                        // behaviour -----------------------------------------------------------------------------------
                        try {
                            const behaviourData = JSON.parse(entry.behaviours);

                            if (behaviourData) {
                                Object.entries(behaviourData).forEach(([, value]) => {
                                    if (typeof value === 'string') {
                                        const behaviour = behStates.get(parseInt(value, 10));

                                        if (behaviour) {
                                            if (behaviourStr.length > 0) {
                                                behaviourStr += ', ';
                                            }

                                            behaviourStr += behaviour.name;
                                        }
                                    }
                                });
                            }
                        } catch (e) {
                            behaviourStr = '';
                        }

                        // group structure -----------------------------------------------------------------------------

                        const group = groupStructure.get(entry.group_structure_id);

                        if (group) {
                            groupStructrStr = group;
                        }

                        // reaction ------------------------------------------------------------------------------------

                        const cate = enCats.get(entry.reaction_id);

                        if (cate) {
                            reactionStr = cate.name;
                        }

                        // freq ----------------------------------------------------------------------------------------

                        try {
                            const freqData = JSON.parse(entry.freq_behaviour);

                            if (freqData) {
                                Object.entries(freqData).forEach(([, value]) => {
                                    if (typeof value === 'string') {
                                        if (freqStr.length > 0) {
                                            freqStr += ', ';
                                        }

                                        freqStr += value;
                                    }
                                });
                            }
                        } catch (e) {
                            freqStr = '';
                        }

                        // other species -------------------------------------------------------------------------------

                        try {
                            const otherSpeciesData = JSON.parse(entry.other_species);

                            if (otherSpeciesData) {
                                Object.entries(otherSpeciesData).forEach(([, value]) => {
                                    if (typeof value === 'string') {
                                        const otherSpecie = species.get(parseInt(value, 10));

                                        if (otherSpecie) {
                                            if (otherSpeciesStr.length > 0) {
                                                otherSpeciesStr += ', ';
                                            }

                                            otherSpeciesStr += otherSpecie.name;
                                        }
                                    }
                                });
                            }
                        } catch (e) {
                            otherSpeciesStr = '';
                        }

                        // ---------------------------------------------------------------------------------------------

                        let beaufort_wind = entry.beaufort_wind_n;

                        if (entry.beaufort_wind_n === '') {
                            beaufort_wind = `${entry.beaufort_wind}`;
                        }

                        data.push([
                            `${entry.id}`,
                            `${date.format('YYYY/MM/DD')}`,
                            `${entry.tour_start}`,
                            `${entry.tour_end}`,
                            `${vehicleStr}`,
                            `${vehicleDriverStr}`,
                            `${userStr}`,
                            `${beaufort_wind}`,
                            specieStr,
                            `${entry.species_count}`,
                            `${entry.duration_from}`,
                            `${entry.duration_until}`,
                            `${positionBeginLat}`,
                            `${positionBeginLon}`,
                            `${positionEndLat}`,
                            `${positionEndLon}`,
                            UtilSelect.getSelectStr(entry.distance_coast_estimation_gps),
                            distance,
                            UtilSelect.getSelectStr(entry.juveniles),
                            UtilSelect.getSelectStr(entry.calves),
                            UtilSelect.getSelectStr(entry.newborns),
                            behaviourStr,
                            groupStructrStr,
                            UtilSelect.getSelectStr(entry.subgroups),
                            reactionStr,
                            freqStr,
                            UtilSelect.getSelectStr(entry.photo_taken),
                            `${entry.recognizable_animals}`,
                            otherSpeciesStr,
                            `${entry.other}`,
                            `${entry.other_vehicle}`,
                            `${entry.note}`
                        ]);
                    }
                }
            }

            const buffer = xlsx.build([{name: 'Sightings',
                data,
                options: {}}]);

            // response.writeHead(200, [['Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']]);
            try {
                return buffer;
            } catch (e) {
                console.log(e);
            }
        }

        return null;
    }

    /**
     * delete
     * @param session
     * @param request
     */
    @Post('/json/sightings/delete')
    public async delete(@Session() session: any, @Body() request: SightingDeleteRequest): Promise<DefaultReturn> {
        if ((session.user !== undefined) && session.user.isLogin) {
            if (!session.user.isAdmin) {
                return {
                    statusCode: StatusCodes.FORBIDDEN
                };
            }

            const sightingRepository = MariaDbHelper.getConnection().getRepository(SightingDB);

            await sightingRepository.delete({
                id: request.id
            });

            return {
                statusCode: StatusCodes.OK
            };
        }

        return {
            statusCode: StatusCodes.UNAUTHORIZED
        };
    }

    /**
     * getImage
     * @param session
     * @param id
     * @param filename
     */
    @Get('/json/sightings/getimage/:id/:filename')
    public async getImage(
        @Session() session: any,
        @Param('id') id: number,
        @Param('filename') filename: string
    ): Promise<Buffer | null> {
        if ((session.user !== undefined) && session.user.isLogin) {
            const sightingRepository = MariaDbHelper.getConnection().getRepository(SightingDB);
            const sighting = await sightingRepository.findOne({
                where: {
                    id
                }
            });

            if (sighting) {
                try {
                    const sightingUidDir = UtilImageUploadPath.getSightingDirector(sighting.unid);

                    if (sightingUidDir) {
                        return fs.readFileSync(Path.join(sightingUidDir, filename));
                    }

                    Logger.log(`getImage: image upload is empty by id: ${id}`);
                } catch (e) {
                    Logger.log(e);
                }
            } else {
                Logger.log(`getImage: sighting not found by id: ${id}`);
            }
        } else {
            Logger.log(`getImage: session not login by id: ${id}`);
        }

        return null;
    }

}