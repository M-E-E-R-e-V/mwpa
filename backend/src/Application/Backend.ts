import {BackendApp, ConfigOptions, DefaultArgs, HttpService, SchemaDefaultArgs} from 'figtree';
import {Schema} from 'vts';
import {MWPAConfig} from '../Config/MWPAConfig.js';
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
        this._serviceManager.add(new HttpService(RouteLoader));
    }

}