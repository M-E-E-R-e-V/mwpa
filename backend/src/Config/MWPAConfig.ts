import {Config, ConfigBackend} from '@stefanwerfling/figtree';
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

        // Reverse-proxy trust — the only way to set Express' `trust proxy` on
        // the server (figtree maps no env var for httpserver.proxy.trust). Must
        // be set behind nginx/Traefik so express-rate-limit reads the real
        // client IP from X-Forwarded-For (otherwise every client collapses to
        // the proxy IP and one 429 blocks everyone — and the Blacklist lists
        // the proxy instead of the real visitors).
        const proxyTrust = process.env[ENV_MWPA.MWPA_HTTPSERVER_PROXY_TRUST];

        if (proxyTrust !== undefined && proxyTrust.trim() !== '' && aConfig.httpserver) {
            aConfig.httpserver.proxy = {
                trust: MWPAConfig._parseProxyTrust(proxyTrust)
            };
        }

        return aConfig;
    }

    /**
     * Parse the MWPA_HTTPSERVER_PROXY_TRUST env value into Express' `trust
     * proxy` shape: `'true'`/`'false'` → boolean, a comma-separated list →
     * string[], otherwise the raw string (IP / subnet / preset like
     * 'loopback'). Avoid the bare `true` in production — express-rate-limit
     * rejects a permissive trust proxy.
     * @param {string} raw
     * @return {string | boolean | string[]}
     * @protected
     */
    protected static _parseProxyTrust(raw: string): string | boolean | string[] {
        const value = raw.trim();
        const lower = value.toLowerCase();

        if (lower === 'true') {
            return true;
        }

        if (lower === 'false') {
            return false;
        }

        if (value.includes(',')) {
            return value.split(',').map((part) => part.trim()).filter((part) => part !== '');
        }

        return value;
    }

}