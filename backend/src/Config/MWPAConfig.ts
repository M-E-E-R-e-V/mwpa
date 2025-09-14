import {Config, ConfigBackend} from 'figtree';
import {BackendConfigOptions, ENV_MWPA, SchemaBackendConfigOptions} from 'mwpa_schemas';

/**
 * MWPA Config
 */
export class MWPAConfig extends ConfigBackend<BackendConfigOptions> {

    /**
     * Return the Config instance
     * @return {Config}
     */
    public static getInstance(): MWPAConfig {
        if (!Config._instance) {
            Config._instance = new MWPAConfig(SchemaBackendConfigOptions);
        }

        return Config._instance as MWPAConfig;
    }

    /**
     * _loadEnv
     * @param {BackendConfigOptions|null} aConfig
     * @returns {BackendConfigOptions|null}
     * @protected
     */
    protected _loadEnv(aConfig: BackendConfigOptions | null): BackendConfigOptions | null {
        let config = aConfig;

        if (config === null) {
            config = {
                datadir: null,
                db: {},
                httpserver: {
                    port: ConfigBackend.DEFAULT_HTTPSERVER_PORT,
                    publicdir: ConfigBackend.DEFAULT_HTTPSERVER_PUBLICDIR
                },
                logging: {
                    level: 'error'
                }
            };
        }

        config = super._loadEnv(config);

        if (config) {
            config = this._loadMWPAEnv(config);
        }

        return config;
    }

    /**
     * load MWPA env
     * @param {BackendConfigOptions} aConfig
     * @return {BackendConfigOptions}
     * @protected
     */
    protected _loadMWPAEnv(aConfig: BackendConfigOptions): BackendConfigOptions {
        if (process.env[ENV_MWPA.MWPA_DATA_DIR]) {
            aConfig.datadir = process.env[ENV_MWPA.MWPA_DATA_DIR];
        }

        return aConfig;
    }

}