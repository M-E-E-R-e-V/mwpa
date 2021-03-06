import * as bodyParser from 'body-parser';
import * as fs from 'fs';
import minimist from 'minimist';
import * as path from 'path';
import session from 'express-session';
import 'reflect-metadata';
import cookieParser from 'cookie-parser';
import {Im2020} from './app/Import/Im2020';
import {Driver} from './app/Main/Driver';
import {EncounterCategories} from './app/Main/EncounterCategories';
import {Login} from './app/Main/Login';
import {Sightings} from './app/Main/Sightings';
import {Species} from './app/Main/Species';
import {User} from './app/Main/User';
import {Vehicle} from './app/Main/Vehicle';
import {CalcAutoFill022022} from './app/Utils/CalcAutoFill022022';
// @ts-ignore
import {Config} from './inc/Config/Config';
import {DBSetup} from './inc/Db/MariaDb/DBSetup';
import {BehaviouralStates as BehaviouralStatesDB} from './inc/Db/MariaDb/Entity/BehaviouralStates';
import {EncounterCategories as EncounterCategoriesDB} from './inc/Db/MariaDb/Entity/EncounterCategories';
import {Group as GroupDB} from './inc/Db/MariaDb/Entity/Group';
import {Organization as OrganizationDB} from './inc/Db/MariaDb/Entity/Organization';
import {Sighting as SightingDB} from './inc/Db/MariaDb/Entity/Sighting';
import {SightingTour as SightingTourDB} from './inc/Db/MariaDb/Entity/SightingTour';
import {Species as SpeciesDB} from './inc/Db/MariaDb/Entity/Species';
import {User as UserDB} from './inc/Db/MariaDb/Entity/User';
import {UserGroups as UserGroupsDB} from './inc/Db/MariaDb/Entity/UserGroups';
import {Vehicle as VehicleDB} from './inc/Db/MariaDb/Entity/Vehicle';
import {VehicleDriver as VehicleDriverDB} from './inc/Db/MariaDb/Entity/VehicleDriver';
import {MariaDbHelper} from './inc/Db/MariaDb/MariaDbHelper';
import {Logger} from './inc/Logger/Logger';
import {Server} from './inc/Server/Server';

/**
 * main application
 */
(async(): Promise<void> => {
    const argv = minimist(process.argv.slice(2));
    let configfile = path.join(__dirname, '/config.json');
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

    // -----------------------------------------------------------------------------------------------------------------

    if (tconfig.logging) {
        Logger.DEBUG_LOGGING = tconfig.logging.debugging;
    }

    // -----------------------------------------------------------------------------------------------------------------

    try {
        // MariaDb -----------------------------------------------------------------------------------------------------
        await MariaDbHelper.init({
            type: 'mysql',
            // 'localhost',
            host: tconfig.db.mysql.host,
            // 3306,
            port: tconfig.db.mysql.port,
            // 'root',
            username: tconfig.db.mysql.username,
            // 'test',
            password: tconfig.db.mysql.password,
            // 'ccc',
            database: tconfig.db.mysql.database,
            entities: [
                UserDB,
                OrganizationDB,
                GroupDB,
                UserGroupsDB,
                SpeciesDB,
                VehicleDB,
                VehicleDriverDB,
                SightingTourDB,
                SightingDB,
                EncounterCategoriesDB,
                BehaviouralStatesDB
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
            bodyParser.urlencoded({extended: true}),
            bodyParser.json(),
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
            Login,
            User,
            Sightings,
            Species,
            EncounterCategories,
            Vehicle,
            Driver
        ],
        publicDir: public_dir
    });

    // listen, start express server
    mServer.listen();

})();