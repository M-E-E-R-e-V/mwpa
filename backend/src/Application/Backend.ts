import {ACL, BackendApp, HttpService, MariaDBService} from 'figtree';
import {ConfigOptions, DefaultArgs, SchemaDefaultArgs} from 'figtree-schemas';
import {Schema} from 'vts';
import {ACLRbac} from '../ACL/ACLRbac.js';
import {MWPAConfig} from '../Config/MWPAConfig.js';
import {MWPADbLoader} from '../Db/MariaDb/MWPADbLoader.js';
import {SyncRolesRightsSetup} from '../Db/MariaDb/Setup/SyncRolesRightsSetup.js';
import {TruncateSightingExtendedSetup} from '../Db/MariaDb/Setup/TruncateSightingExtendedSetup.js';
import {RouteLoader} from '../Routes/RouteLoader.js';
import {DepthService} from '../Service/DepthService.js';
import {FishingEffortService} from '../Service/FishingEffortService.js';
import {OceanService} from '../Service/OceanService.js';
import {PendingTrackPromotionService} from '../Service/PendingTrack/PendingTrackPromotionService.js';
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
            new MariaDBService(
                MWPADbLoader,
                undefined,
                undefined,
                undefined,
                [new SyncRolesRightsSetup(), new TruncateSightingExtendedSetup()]
            )
        );

        this._serviceManager.add(new HttpService(RouteLoader));
        this._serviceManager.add(new DepthService());
        this._serviceManager.add(new WeatherService());
        this._serviceManager.add(new OceanService());
        this._serviceManager.add(new FishingEffortService());
        this._serviceManager.add(new PendingTrackPromotionService());
    }

}