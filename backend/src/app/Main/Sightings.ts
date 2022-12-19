import moment from 'moment';
import xlsx from 'node-xlsx';
import {Response} from 'express';
import {Body, Get, JsonController, Post, Res, Session} from 'routing-controllers';
import {BehaviouralStates as BehaviouralStatesDB} from '../../inc/Db/MariaDb/Entity/BehaviouralStates';
import {EncounterCategories as EncounterCategoriesDB} from '../../inc/Db/MariaDb/Entity/EncounterCategories';
import {Sighting as SightingDB} from '../../inc/Db/MariaDb/Entity/Sighting';
import {Species as SpeciesDB} from '../../inc/Db/MariaDb/Entity/Species';
import {User as UserDB} from '../../inc/Db/MariaDb/Entity/User';
import {Vehicle as VehicleDB} from '../../inc/Db/MariaDb/Entity/Vehicle';
import {VehicleDriver as VehicleDriverDB} from '../../inc/Db/MariaDb/Entity/VehicleDriver';
import {MariaDbHelper} from '../../inc/Db/MariaDb/MariaDbHelper';
import {DefaultReturn} from '../../inc/Routes/DefaultReturn';
import {StatusCodes} from '../../inc/Routes/StatusCodes';
import {TypeSighting} from '../../inc/Types/TypeSighting';
import {UtilDistanceCoast} from '../../inc/Utils/UtilDistanceCoast';
import {UtilPosition} from '../../inc/Utils/UtilPosition';

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
            session.sightingFilter = filter;

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

    /**
     * getExcel
     * @param session
     * @param response
     */
    @Get('/json/sightings/list/excel')
    public async getExcel(@Session() session: any, @Res() response: Response): Promise<void> {
        if ((session.user !== undefined) && session.user.isLogin) {
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
                    'Boat',
                    'Skipper',
                    'Observer',
                    'Wind/Seastate (Beaufort)',
                    'Date',
                    'Start of trip',
                    'End of trip',
                    'Duration from',
                    'Duration until',
                    'Position begin',
                    'Position end',
                    'Distance to nearst coast (nm)',
                    'Photos taken',
                    'Estimation without GPS',
                    'Species',
                    'Number of animals',
                    'Juveniles',
                    'Calves',
                    'Newborns',
                    'Behaviour',
                    'Subgroups',
                    'Group structure',
                    'Reaction',
                    'Frequent behaviours of individuals',
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
                        id: 'DESC'
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

                        const positionBegin = UtilPosition.getStr(entry.location_begin);
                        const positionEnd = UtilPosition.getStr(entry.location_end);

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

                        data.push([
                            `${entry.id}`,
                            `${vehicleStr}`,
                            `${vehicleDriverStr}`,
                            `${userStr}`,
                            `${entry.beaufort_wind}`,
                            `${date.format('YYYY/DD/MM')}`,
                            `${entry.tour_start}`,
                            `${entry.tour_end}`,
                            `${entry.duration_from}`,
                            `${entry.duration_until}`,
                            `${positionBegin}`,
                            `${positionEnd}`,
                            distance,
                            entry.photo_taken ? 'Yes' : 'No',
                            entry.distance_coast_estimation_gps ? 'Yes' : 'No',
                            specieStr,
                            `${entry.species_count}`,
                            entry.juveniles ? 'Yes' : 'No',
                            entry.calves ? 'Yes' : 'No',
                            entry.newborns ? 'Yes' : 'No',
                            behaviourStr,
                            entry.subgroups ? 'Yes' : 'No',
                            groupStructrStr,
                            reactionStr,
                            freqStr,
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
                response.end(buffer);
            } catch (e) {
                console.log(e);
            }
        }
    }

}