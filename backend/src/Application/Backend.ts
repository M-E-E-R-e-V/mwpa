import {ACL, BackendApp} from 'figtree';
import {MWPAHttpService} from './Http/MWPAHttpService.js';
import {MWPAMariaDBService} from './MWPAMariaDBService.js';
import {ConfigOptions, DefaultArgs, SchemaDefaultArgs} from 'figtree-schemas';
import {Schema} from 'vts';
import {ACLRbac} from '../ACL/ACLRbac.js';
import {MWPAConfig} from '../Config/MWPAConfig.js';
import {MWPADbLoader} from '../Db/MariaDb/MWPADbLoader.js';
import {SightingNoteUtf8mb4Setup} from '../Db/MariaDb/Setup/SightingNoteUtf8mb4Setup.js';
import {SyncRolesRightsSetup} from '../Db/MariaDb/Setup/SyncRolesRightsSetup.js';
import {TruncateSightingExtendedSetup} from '../Db/MariaDb/Setup/TruncateSightingExtendedSetup.js';
import {RouteLoader} from '../Routes/RouteLoader.js';
import {AisPruneService} from '../Service/Ais/AisPruneService.js';
import {LiveAisService} from '../Service/Ais/LiveAisService.js';
import {DepthService} from '../Service/DepthService.js';
import {ExternalTourService} from '../Service/ExternalTourService.js';
import {FishingEffortService} from '../Service/FishingEffortService.js';
import {OceanService} from '../Service/OceanService.js';
import {WeatherService} from '../Service/WeatherService.js';

/**
 * Backend
 */
export class Backend extends BackendApp<DefaultArgs, ConfigOptions> {

    /**
     * Backend Name
     */
    public static NAME = 'mwpa';

    /**
     * Constructor
     */
    public constructor() {
        super(Backend.NAME);
    }

    /**
     * Get config instacne
     * @return {MWPAConfig}
     * @protected
     */
    protected _getConfigInstance(): MWPAConfig {
        const config = MWPAConfig.getInstance();
        config.setAppName(Backend.NAME);
        config.setAppTitle('Mammal watching. Processing. Analysing.');

        return config;
    }

    /**
     * Get arg schema
     * @protected
     */
    protected _getArgSchema(): Schema<DefaultArgs>|null {
        return SchemaDefaultArgs;
    }

    /**
     * Init Services
     * @protected
     */
    protected async _initServices(): Promise<void> {
        ACL.getInstance().addController(new ACLRbac());

        this._serviceManager.add(
            new MWPAMariaDBService(
                MWPADbLoader,
                undefined,
                undefined,
                undefined,
                [new SyncRolesRightsSetup(), new TruncateSightingExtendedSetup(), new SightingNoteUtf8mb4Setup()]
            )
        );

        this._serviceManager.add(new MWPAHttpService(RouteLoader));
        this._serviceManager.add(new DepthService());
        this._serviceManager.add(new WeatherService());
        this._serviceManager.add(new OceanService());
        this._serviceManager.add(new FishingEffortService());
        this._serviceManager.add(new ExternalTourService());
        this._serviceManager.add(new LiveAisService());
        this._serviceManager.add(new AisPruneService());
    }

}