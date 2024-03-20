import * as bodyParser from 'body-parser';
import * as fs from 'fs';
import minimist from 'minimist';
import * as Path from 'path';
import session from 'express-session';
import 'reflect-metadata';
import cookieParser from 'cookie-parser';
import {OfficeReport as OfficeReportController} from './app/Export/OfficeReport';
import {Im2020} from './app/Import/Im2020';
import {BehaviouralStates as BehaviouralStatesMainController} from './app/Main/BehaviouralStates';
import {Organization as OrganizationMainController} from './app/Main/Organization';
import {BehaviouralStates as BehaviouralStatesMobileController} from './app/Mobile/BehaviouralStates';
import {EncounterCategories as EncounterCategoriesMainController} from './app/Main/EncounterCategories';
import {EncounterCategories as EncounterCategoriesMobileController} from './app/Mobile/EncounterCategories';
import {Group as GroupMainController} from './app/Main/Group';
import {Login as LoginMainController} from './app/Main/Login';
import {Info as InfoMobileController} from './app/Mobile/Info';
import {Login as LoginMobileController} from './app/Mobile/Login';
import {Sightings as SightingsMainController} from './app/Main/Sightings';
import {Tours as ToursMainController} from './app/Main/Tours';
import {Species as SpeciesMainController} from './app/Main/Species';
import {Sightings as SightingsMobileController} from './app/Mobile/Sightings';
import {SightingTourTracking as SightingTourTrackingMobileController} from './app/Mobile/SightingTourTracking';
import {Species as SpeciesMobileController} from './app/Mobile/Species';
import {User as UserMainController} from './app/Main/User';
import {TrackingArea as TrackingAreaController} from './app/Mobile/TrackingArea';
import {User as UserMobileController} from './app/Mobile/User';
import {Vehicle as VehicleMainController} from './app/Main/Vehicle';
import {Vehicle as VehicleMobileController} from './app/Mobile/Vehicle';
import {VehicleDriver as VehicleDriverMainController} from './app/Main/VehicleDriver';
import {VehicleDriver as VehicleDriverMobileController} from './app/Mobile/VehicleDriver';
import {CalcAutoFill022022} from './app/Utils/CalcAutoFill022022';
import {Config} from './inc/Config/Config';
import {DBSetup} from './inc/Db/MariaDb/DBSetup';
import {BehaviouralStates as BehaviouralStatesDB} from './inc/Db/MariaDb/Entity/BehaviouralStates';
import {EncounterCategories as EncounterCategoriesDB} from './inc/Db/MariaDb/Entity/EncounterCategories';
import {ExternalReceiver as ExternalReceiverDB} from './inc/Db/MariaDb/Entity/ExternalReceiver';
import {Group as GroupDB} from './inc/Db/MariaDb/Entity/Group';
import {Organization as OrganizationDB} from './inc/Db/MariaDb/Entity/Organization';
import {OrganizationTrackingArea as OrganizationTrackingAreaDB} from './inc/Db/MariaDb/Entity/OrganizationTrackingArea';
import {Sighting as SightingDB} from './inc/Db/MariaDb/Entity/Sighting';
import {SightingExtended as SightingExtendedDB} from './inc/Db/MariaDb/Entity/SightingExtended';
import {SightingTour as SightingTourDB} from './inc/Db/MariaDb/Entity/SightingTour';
import {SightingTourTracking as SightingTourTrackingDB} from './inc/Db/MariaDb/Entity/SightingTourTracking';
import {Species as SpeciesDB} from './inc/Db/MariaDb/Entity/Species';
import {SpeciesExternLink as SpeciesExternLinkDB} from './inc/Db/MariaDb/Entity/SpeciesExternLink';
import {SpeciesGroup as SpeciesGroupDB} from './inc/Db/MariaDb/Entity/SpeciesGroup';
import {User as UserDB} from './inc/Db/MariaDb/Entity/User';
import {UserGroups as UserGroupsDB} from './inc/Db/MariaDb/Entity/UserGroups';
import {Vehicle as VehicleDB} from './inc/Db/MariaDb/Entity/Vehicle';
import {VehicleDriver as VehicleDriverDB} from './inc/Db/MariaDb/Entity/VehicleDriver';
import {Devices as DevicesDB} from './inc/Db/MariaDb/Entity/Devices';
import {MariaDbHelper} from './inc/Db/MariaDb/MariaDbHelper';
import {Logger} from './inc/Logger/Logger';
import {Server} from './inc/Server/Server';
import {DepthService} from './inc/Service/DepthService';

/**
 * main application
 */
(async(): Promise<void> => {
    const argv = minimist(process.argv.slice(2));
    let configfile = Path.join(__dirname, '/config.json');
    let importfile: string|null = null;
    let calcfile: string|null = null;

    if (argv.config) {
        configfile = argv.config;
    }

    if (argv.import) {
        importfile = argv.import;
    }

    if (argv.calc) {
        calcfile = argv.calc;
    }

    try {
        if (!fs.existsSync(configfile)) {
            console.log(`Config not found: ${configfile}, exit.`);
            return;
        }
    } catch (err) {
        console.log(`Config is not load: ${configfile}, exit.`);
        console.error(err);
        return;
    }

    const tconfig = await Config.load(configfile);

    if (tconfig === null) {
        console.log(`Configloader is return empty config, please check your configfile: ${configfile}`);
        return;
    }

    // set global
    Config.set(tconfig);

    // -----------------------------------------------------------------------------------------------------------------

    if (tconfig.logging) {
        Logger.DEBUG_LOGGING = tconfig.logging.debugging;
    }

    // -----------------------------------------------------------------------------------------------------------------

    try {
        // MariaDb -----------------------------------------------------------------------------------------------------
        await MariaDbHelper.init({
            type: 'mysql',
            charset: 'utf8mb4_bin',
            // 'localhost',
            host: tconfig.db.mysql.host,
            // 3306,
            port: tconfig.db.mysql.port,
            // 'root',
            username: tconfig.db.mysql.username,
            // 'test',
            password: tconfig.db.mysql.password,
            // 'mwpa',
            database: tconfig.db.mysql.database,
            entities: [
                UserDB,
                OrganizationDB,
                OrganizationTrackingAreaDB,
                GroupDB,
                UserGroupsDB,
                SpeciesDB,
                SpeciesExternLinkDB,
                SpeciesGroupDB,
                VehicleDB,
                VehicleDriverDB,
                SightingTourDB,
                SightingTourTrackingDB,
                SightingDB,
                EncounterCategoriesDB,
                BehaviouralStatesDB,
                DevicesDB,
                ExternalReceiverDB,
                SightingExtendedDB
            ],
            migrations: [
            ],
            migrationsRun: true,
            synchronize: true
        });

        // db setup first init
        await DBSetup.firstInit();
    } catch (error) {
        console.log('Error while connecting to the database', error);
        return;
    }

    // import file for db ----------------------------------------------------------------------------------------------

    if (importfile !== null) {
        try {
            if (!fs.existsSync(importfile)) {
                console.log(`Importfile not found: ${importfile}, exit.`);
                return;
            }

            const importer = new Im2020(importfile);
            const imported = await importer.import();

            if (imported) {
                console.log(`Import is success: ${importfile}, exit.`);
            } else {
                console.log(`Import faild: ${importfile}, exit.`);
            }

            return;
        } catch (err) {
            console.log(`Importfile is not load: ${importfile}, exit.`);
            console.error(err);
            return;
        }
    }

    // calc file -------------------------------------------------------------------------------------------------------

    if (calcfile !== null) {
        try {
            if (!fs.existsSync(calcfile)) {
                console.log(`CalcFile not found: ${calcfile}, exit.`);
                return;
            }

            const calcAutoFill = new CalcAutoFill022022(calcfile, `${calcfile}.new.xlsx`);
            await calcAutoFill.calc();

            return;
        } catch (err) {
            console.log(`CalcFile is not load: ${importfile}, exit.`);
            console.error(err);
            return;
        }
    }

    // start server ----------------------------------------------------------------------------------------------------

    let aport = 3000;
    let public_dir = '';
    let session_secret = 'mwpa';
    let session_cookie_path = '/';
    let session_cookie_max_age = 6000000;

    if (tconfig.httpserver) {
        if (tconfig.httpserver.port) {
            aport = tconfig.httpserver.port;
        }

        if (tconfig.httpserver.publicdir) {
            public_dir = tconfig.httpserver.publicdir;
        }

        if (tconfig.httpserver.session) {
            if (tconfig.httpserver.session.secret) {
                session_secret = tconfig.httpserver.session.secret;
            }

            if (tconfig.httpserver.session.cookie_path) {
                session_cookie_path = tconfig.httpserver.session.cookie_path;
            }

            if (tconfig.httpserver.session.cookie_max_age) {
                session_cookie_max_age = tconfig.httpserver.session.cookie_max_age;
            }
        }
    }

    // -----------------------------------------------------------------------------------------------------------------

    const mServer = new Server({
        port: aport,
        middleWares: [
            bodyParser.urlencoded({
                extended: true,
                limit: '150mb'
            }),
            bodyParser.json({limit: '150mb'}),
            cookieParser(),
            session({
                secret: session_secret,
                resave: true,
                saveUninitialized: true,
                store: new session.MemoryStore(),
                cookie: {
                    path: session_cookie_path,
                    secure: false,
                    maxAge: session_cookie_max_age
                }
            })
        ],
        routes: [],
        controllers: [
            // main ----------------------------------------------------------------------------------------------------
            LoginMainController,
            UserMainController,
            SightingsMainController,
            ToursMainController,
            SpeciesMainController,
            EncounterCategoriesMainController,
            VehicleMainController,
            VehicleDriverMainController,
            GroupMainController,
            BehaviouralStatesMainController,
            OrganizationMainController,
            OfficeReportController,

            // mobile --------------------------------------------------------------------------------------------------
            InfoMobileController,
            LoginMobileController,
            UserMobileController,
            VehicleMobileController,
            VehicleDriverMobileController,
            EncounterCategoriesMobileController,
            BehaviouralStatesMobileController,
            SpeciesMobileController,
            SightingsMobileController,
            SightingTourTrackingMobileController,
            TrackingAreaController
        ],
        publicDir: public_dir
    });

    // listen, start express server
    mServer.listen();

    DepthService.getInstance().start().then();
})();