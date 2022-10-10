import xlsx from 'node-xlsx';
import * as bcrypt from 'bcrypt';
import moment from 'moment';
import {EncounterCategories as EncounterCategoriesDB} from '../../inc/Db/MariaDb/Entity/EncounterCategories';
import {Group as GroupDB} from '../../inc/Db/MariaDb/Entity/Group';
import {Organization as OrganizationDB} from '../../inc/Db/MariaDb/Entity/Organization';
import {Sighting as SightingDB} from '../../inc/Db/MariaDb/Entity/Sighting';
import {SightingTour as SightingTourDB} from '../../inc/Db/MariaDb/Entity/SightingTour';
import {Species as SpeciesDB} from '../../inc/Db/MariaDb/Entity/Species';
import {User as UserDB} from '../../inc/Db/MariaDb/Entity/User';
import {Vehicle as VehicleDB} from '../../inc/Db/MariaDb/Entity/Vehicle';
import {VehicleDriver as VehicleDriverDB} from '../../inc/Db/MariaDb/Entity/VehicleDriver';
import {MariaDbHelper} from '../../inc/Db/MariaDb/MariaDbHelper';
import {DateHelper} from '../../inc/Utils/DateHelper';
import {NameCorection} from '../../inc/Utils/NameCorection';

/**
 * Im2020KeyValueObject
 */
interface Im2020KeyValueObject {
    [key: string]: string;
}

/**
 * Im2020
 * Import file 2020 is a prepared file with fixed columns. The import can only be carried out once with this file.
 */
export class Im2020 {

    /**
     * xlsx file
     * @protected
     */
    protected _xlsxFile: string;

    /**
     * organization
     * @protected
     */
    protected _organization: OrganizationDB | undefined;

    /**
     * create user
     * @protected
     */
    protected _createUser: UserDB | undefined;

    /**
     * constructor
     * @param axlsxFile
     */
    public constructor(axlsxFile: string) {
        this._xlsxFile = axlsxFile;
    }

    /**
     * import
     */
    public async import(): Promise<boolean> {
        // init --------------------------------------------------------------------------------------------------------

        this._organization = await this._getOrganization();
        this._createUser = await this._getCreaterUser();

        // parse excel file --------------------------------------------------------------------------------------------

        const workSheets = xlsx.parse(this._xlsxFile, {
            cellDates: true
        });

        if (!workSheets) {
            return false;
        }

        if (workSheets.length === 0) {
            return false;
        }

        const sheet0 = workSheets[0];

        if (!sheet0 || !sheet0.data) {
            return false;
        }

        const rows = sheet0.data;

        let colums: string[] | null = null;
        const sortedTours = new Map<string, Map<string, Im2020KeyValueObject[]>>();

        // convert excel rows to hashmap list --------------------------------------------------------------------------

        let index = 0;

        for (const row of rows) {
            index++;

            if (index === 1) {
                continue;
            }


            const rowData: any[] = row as any[];

            if (!colums) {
                colums = rowData;
                continue;
            }

            // transforme to object ------------------------------------------------------------------------------------

            const rowObj: Im2020KeyValueObject = {};

            for (let i = 0; i < rowData.length; i++) {
                const columName = colums[i];
                const columValue = rowData[i];

                rowObj[columName] = columValue;
            }

            // collect to date -> boat -> X entry ----------------------------------------------------------------------

            const dateTourTime = this._convertColsToDateTime(rowObj.DATE, rowObj.TIME);

            const strBoat = rowObj.Boat;
            let dayTour = 1;

            if (dateTourTime.getHours() === 14) {
                if (dateTourTime.getMinutes() > 30) {
                    dayTour = 2;
                }
            } else if (dateTourTime.getHours() > 14) {
                dayTour = 2;
            }

            const sortDate = new Date(
                dateTourTime.getFullYear(),
                dateTourTime.getMonth(),
                dateTourTime.getDate(),
                0,
                0
            );

            const strDate = `${sortDate.getTime()}} ${dayTour}`;

            let boatMap = new Map();

            if (sortedTours.has(strDate)) {
                boatMap = sortedTours.get(strDate)!!;
            }

            if (boatMap.has(strBoat)) {
                const list = boatMap.get(strBoat) as Im2020KeyValueObject[];
                list.push(rowObj);

                boatMap.set(strBoat, list);
            } else {
                boatMap.set(strBoat, [rowObj]);
            }

            sortedTours.set(strDate, boatMap);
        }

        // import sorted list by index for sighting --------------------------------------------------------------------
        const tsortedTours = new Map([...sortedTours].sort());

        for (const [, boatMap] of tsortedTours) {
            for (const [, list] of boatMap) {
                let tourId: number | null = null;
                const rowList = list as Im2020KeyValueObject[];

                for (const aRowObj of rowList) {
                    if (!tourId) {
                        tourId = await this._importSightingTour(aRowObj);
                    }

                    await this._importRow(tourId, aRowObj);

                }
            }
        }

        return true;
    }

    /**
     * _getCreaterUser
     * @protected
     */
    protected async _getCreaterUser(): Promise<UserDB> {
        if (!this._organization) {
            throw new Error('none oranization found, import user can not create');
        }

        const userRepository = MariaDbHelper.getConnection().getRepository(UserDB);
        const groupRepository = MariaDbHelper.getConnection().getRepository(GroupDB);

        let importerUser = await userRepository.findOne({
            where: {
                username: 'importer'
            }
        });

        if (!importerUser) {
            let importerGroup = await groupRepository.findOne({
                where: {
                    role: 'importer'
                }
            });

            if (!importerGroup) {
                importerGroup = new GroupDB();
                importerGroup.role = 'importer';
                importerGroup.organization_id = this._organization.id;
                importerGroup.description = 'Importer NWPA';

                importerGroup = await MariaDbHelper.getConnection().manager.save(importerGroup);
            }

            importerUser = new UserDB();
            importerUser.username = 'importer';
            importerUser.full_name = 'Importer NWPA';
            importerUser.email = 'importer@mwpa.org';
            importerUser.password = '';
            importerUser.main_groupid = importerGroup.id;

            importerUser = await MariaDbHelper.getConnection().manager.save(importerUser);
        }

        return importerUser;
    }

    /**
     * _getOrganization
     * @protected
     */
    protected async _getOrganization(): Promise<OrganizationDB> {
        const organizationRepository = MariaDbHelper.getConnection().getRepository(OrganizationDB);
        let organization = await organizationRepository.findOne({
            where: {
                id: 1
            }
        });

        if (!organization) {
            const newOrganization = new OrganizationDB();
            newOrganization.description = 'Rename me';

            organization = await MariaDbHelper.getConnection().manager.save(newOrganization);
        }

        return organization;
    }

    /**
     * _importSpecies
     * @param speciesName
     * @protected
     */
    protected async _importSpecies(speciesName: string): Promise<number> {
        const tspeciesName = NameCorection.renameUpperChars(speciesName);
        let speciesId = 0;

        if (tspeciesName) {
            const speciesRepository = MariaDbHelper.getConnection().getRepository(SpeciesDB);
            let speciesData = await speciesRepository.findOne({
                where: {
                    name: tspeciesName
                }
            });

            if (!speciesData) {
                const newSpecies = new SpeciesDB();
                newSpecies.name = tspeciesName;
                speciesData = await MariaDbHelper.getConnection().manager.save(newSpecies);
            }

            speciesId = speciesData.id;
        }

        return speciesId;
    }

    /**
     * _importVehicle
     * @param vehicleName
     * @protected
     */
    protected async _importVehicle(vehicleName: string): Promise<number> {
        const tvehicleName = NameCorection.renameUpperChars(vehicleName);
        let vehicleId = 0;

        if (tvehicleName) {
            const vehicleRepository = MariaDbHelper.getConnection().getRepository(VehicleDB);
            let vehicleData = await vehicleRepository.findOne({
                where: {
                    organization_id: this._organization!.id,
                    description: tvehicleName
                }
            });

            if (!vehicleData) {
                const newVehicle = new VehicleDB();
                newVehicle.organization_id = this._organization!.id;
                newVehicle.description = tvehicleName;

                vehicleData = await MariaDbHelper.getConnection().manager.save(newVehicle);
            }

            vehicleId = vehicleData.id;
        }

        return vehicleId;
    }

    /**
     * _importVehicleDriver
     * import vehicle driver
     * @param drivername
     * @protected
     */
    protected async _importVehicleDriver(drivername: string): Promise<number> {
        if (!this._organization) {
            throw new Error('none oranization found, import user can not create');
        }

        const tdriverName = NameCorection.renameUpperChars(drivername);
        let driverId = 0;

        if (tdriverName) {
            const userRepository = MariaDbHelper.getConnection().getRepository(UserDB);
            const groupRepository = MariaDbHelper.getConnection().getRepository(GroupDB);

            let driverGroup = await groupRepository.findOne({
                where: {
                    role: 'driver'
                }
            });

            if (!driverGroup) {
                driverGroup = new GroupDB();
                driverGroup.role = 'driver';
                driverGroup.organization_id = this._organization.id;
                driverGroup.description = 'Driver NWPA';

                driverGroup = await MariaDbHelper.getConnection().manager.save(driverGroup);
            }

            let driverUser = await userRepository.findOne({
                where: {
                    username: tdriverName
                }
            });

            if (!driverUser) {
                driverUser = new UserDB();
                driverUser.username = tdriverName;
                driverUser.full_name = tdriverName;
                driverUser.email = 'driverr@mwpa.org';
                driverUser.password = '';
                driverUser.main_groupid = driverGroup.id;

                driverUser = await MariaDbHelper.getConnection().manager.save(driverUser);
            }

            const vdriverRepository = MariaDbHelper.getConnection().getRepository(VehicleDriverDB);

            let driverData = await vdriverRepository.findOne({
                where: {
                    user_id: driverUser.id
                }
            });


            if (!driverData) {
                driverData = new VehicleDriverDB();
                driverData.user_id = driverUser.id;
                driverData.description = 'Importer';

                driverData = await MariaDbHelper.getConnection().manager.save(driverData);
            }

            driverId = driverData.id;
        }

        return driverId;
    }

    /**
     * _importEncounterCategorie
     * @param encounterCategorieName
     * @protected
     */
    protected async _importEncounterCategorie(encounterCategorieName: string): Promise<number> {
        const tEncounterName = NameCorection.renameUpperChars(encounterCategorieName);
        let ecId = 0;

        if (tEncounterName) {
            const encounterCategorieRepository = MariaDbHelper.getConnection().getRepository(EncounterCategoriesDB);
            let ecData = await encounterCategorieRepository.findOne({
                where: {
                    name: tEncounterName
                }
            });

            if (!ecData) {
                const newEncounterCategorie = new EncounterCategoriesDB();
                newEncounterCategorie.name = tEncounterName;

                ecData = await MariaDbHelper.getConnection().manager.save(newEncounterCategorie);
            }

            ecId = ecData.id;
        }

        return ecId;
    }

    /**
     *
     * @protected
     */
    protected async _importSightingTour(row: Im2020KeyValueObject): Promise<number> {
        // vehicle -----------------------------------------------------------------------------------------------------
        const vehicleId = await this._importVehicle(row.Boat);

        // import vehicle driver ---------------------------------------------------------------------------------------
        const vehicleDriverId = await this._importVehicleDriver(row.Skipper);

        // sighting tour -----------------------------------------------------------------------------------------------
        let sightingTour = new SightingTourDB();

        sightingTour.create_datetime = DateHelper.getCurrentDbTime();
        sightingTour.organization_id = this._organization?.id!!;
        sightingTour.creater_id = this._createUser?.id!!;
        sightingTour.vehicle_id = vehicleId;
        sightingTour.vehicle_driver_id = vehicleDriverId;

        // calc start and end date -------------------------------------------------------------------------------------

        const dateTourTime = this._convertColsToDateTime(row.DATE, row.TIME);
        const Wednesday = 3;
        const isDst = DateHelper.isDstObserved(dateTourTime);

        let startTime: Date|null = null;
        let endTime: Date|null = null;

        if (dateTourTime.getDay() === Wednesday) {
            if ((dateTourTime.getHours() >= 11) && (dateTourTime.getHours() <= 15)) {
                startTime = new Date(
                    dateTourTime.getFullYear(),
                    dateTourTime.getMonth(),
                    dateTourTime.getDate(),
                    11,
                    0
                );
            }
        } else if (dateTourTime.getHours() <= 13) {
            startTime = new Date(
                dateTourTime.getFullYear(),
                dateTourTime.getMonth(),
                dateTourTime.getDate(),
                9,
                30
            );
        } else if (isDst) {
            if ((dateTourTime.getHours() > 15) || ((dateTourTime.getHours() === 15) && (dateTourTime.getMinutes() >= 30))) {
                startTime = new Date(
                    dateTourTime.getFullYear(),
                    dateTourTime.getMonth(),
                    dateTourTime.getDate(),
                    15,
                    30
                );
            }
        } else if (dateTourTime.getHours() >= 15) {
            startTime = new Date(
                dateTourTime.getFullYear(),
                dateTourTime.getMonth(),
                dateTourTime.getDate(),
                15,
                0
            );
        }

        if (dateTourTime.getDay() === Wednesday) {
            if ((dateTourTime.getHours() >= 11) && (dateTourTime.getHours() <= 15)) {
                endTime = new Date(
                    dateTourTime.getFullYear(),
                    dateTourTime.getMonth(),
                    dateTourTime.getDate(),
                    15,
                    0
                );
            }
        } else if (dateTourTime.getHours() <= 13) {
            endTime = new Date(
                dateTourTime.getFullYear(),
                dateTourTime.getMonth(),
                dateTourTime.getDate(),
                13,
                0
            );
        } else if (isDst) {
            endTime = new Date(
                dateTourTime.getFullYear(),
                dateTourTime.getMonth(),
                dateTourTime.getDate(),
                19,
                0
            );
        } else if (dateTourTime.getHours() >= 15) {
            endTime = new Date(
                dateTourTime.getFullYear(),
                dateTourTime.getMonth(),
                dateTourTime.getDate(),
                18,
                30
            );
        }

        // -------------------------------------------------------------------------------------------------------------

        const tdate = moment(startTime);

        sightingTour.date = tdate.toString();
        sightingTour.tour_start = `${startTime?.getHours()}:${startTime?.getMinutes()}`;
        sightingTour.tour_end = `${endTime?.getHours()}:${endTime?.getMinutes()}`;

        sightingTour = await MariaDbHelper.getConnection().manager.save(sightingTour);

        return sightingTour.id;
    }

    /**
     * _convertColsToDateTime
     * @param date
     * @param time
     * @protected
     */
    protected _convertColsToDateTime(date: any, time: any): Date {
        let valueDate: any = date;
        let valueTime: any = time;

        if (typeof valueDate === 'string') {
            valueDate = moment(valueDate, 'DD:MM:YYYY').toDate();
        }

        if (typeof valueTime === 'string') {
            valueTime = moment(valueTime, 'HH:mm').toDate();
        }

        const dateTour = new Date(valueDate);
        const timeTour = new Date(valueTime);

        const dateTourTime = new Date(
            dateTour.getFullYear(),
            dateTour.getMonth(),
            dateTour.getDate(),
            timeTour.getHours(),
            timeTour.getMinutes()
        );

        return dateTourTime;
    }

    /**
     * _importRow
     * @param sightingTourId
     * @param row
     * @protected
     */
    protected async _importRow(sightingTourId: number, row: Im2020KeyValueObject): Promise<void> {
        // species -----------------------------------------------------------------------------------------------------
        const speciesId = await this._importSpecies(row.SPECIES);

        // encounter categorie -----------------------------------------------------------------------------------------
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const encounterCategorieId = await this._importEncounterCategorie(row.Encounter_Category);

        // sighting ----------------------------------------------------------------------------------------------------

        const dateTourTime = this._convertColsToDateTime(row.DATE, row.TIME);

        const dateTourStr = `${dateTourTime.getFullYear()}-${dateTourTime.getMonth()}-${dateTourTime.getDate()}`;
        const timeTourStr = `${dateTourTime.getHours()}:${dateTourTime.getMinutes()}`;
        const strBoat = row.Boat;
        const species = row.SPECIES;

        const hashStr = `${dateTourStr},${species},${timeTourStr},${strBoat}`;
        const thash = await bcrypt.hash(hashStr, 10);

        const sightingRepository = MariaDbHelper.getConnection().getRepository(SightingDB);

        let sighting = await sightingRepository.findOne({
            where: {
                hash: thash
            }
        });

        const currentDateTime = DateHelper.getCurrentDbTime();

        if (sighting) {
            sighting.hash_import_count++;
        } else {
            sighting = new SightingDB();
            sighting.hash_import_count = 1;
            sighting.create_datetime = currentDateTime;
            sighting.creater_id = this._createUser?.id!!;
            sighting.hash = thash;
        }

        const tdate = moment(dateTourTime);

        sighting.update_datetime = currentDateTime;
        sighting.tour_id = sightingTourId;
        sighting.date = tdate.toString();
        sighting.species_id = speciesId;

        /*
         * sighting.location_gps_n = row.POSITION_N;
         * sighting.location_gps_w = row.POSITION_W;
         * sighting.individual_count = parseInt(row.GROUP_SIZE, 10) || 0;
         * sighting.encounter_categorie_id = encounterCategorieId;
         * sighting.notes = row.Notes;
         * sighting.exist_images = (parseInt(row.k_Photo, 10) || 0) === -1;
         */

        sighting = await MariaDbHelper.getConnection().manager.save(sighting);

        // other species -----------------------------------------------------------------------------------------------
    }

}