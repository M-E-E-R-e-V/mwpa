import {ACL, BackendApp, ConfigOptions, DefaultArgs, HttpService, MariaDBService, SchemaDefaultArgs} from 'figtree';
import {Schema} from 'vts';
import {ACLRbac} from '../ACL/ACLRbac.js';
import {MWPAConfig} from '../Config/MWPAConfig.js';
import {MWPADbLoader} from '../Db/MariaDb/MWPADbLoader.js';
import {RouteLoader} from '../Routes/RouteLoader.js';

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

        this._serviceManager.add(new MariaDBService(MWPADbLoader));
        this._serviceManager.add(new HttpService(RouteLoader));
    }

}