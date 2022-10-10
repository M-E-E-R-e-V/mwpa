import {readFileSync} from 'fs';
import path from 'path';

/**
 * ConfigOptions
 */
interface ConfigOptions {
    logging?: {
        debugging: boolean;
    };
    db: {
        mysql: {
            host: string;
            port: number;
            username: string;
            password: string;
            database: string;
        };
    };
    httpserver: {
        port?: number;
        publicdir: string;
        session?: {
            secret?: string;
            cookie_path?: string;
            cookie_max_age?: number;
        };
    };

    datadir?: string;

    rootconfigpath?: string;
    rootconfigname?: string;
}

/**
 * Config
 */
export class Config {

    /**
     * global config
     * @private
     */
    private static _config: ConfigOptions|null = null;

    /**
     * set
     * @param config
     */
    public static set(config: ConfigOptions): void {
        this._config = config;
    }

    /**
     * get
     */
    public static get(): ConfigOptions|null {
        return this._config;
    }

    /**
     * load
     * @param configFile
     */
    static async load(configFile: string): Promise<ConfigOptions | null> {
        let config = null;

        try {
            const rawdata = readFileSync(configFile, 'utf-8');

            console.log(`Load json-file: ${configFile}`);

            config = JSON.parse(rawdata);

            config.rootconfigpath = path.dirname(configFile);
            config.rootconfigname = path.basename(configFile);
        } catch (err) {
            console.error(err);
        }

        return config;
    }

}