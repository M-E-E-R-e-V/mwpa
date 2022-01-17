import {existsSync, mkdirSync} from 'fs';
import path from 'path';

/**
 * Logger
 */
export class Logger {

    public static DEBUG_LOGGING = false;

    protected _log: any;

    /**
     * constructor
     * @param filepath
     * @param name
     */
    public constructor(filepath: string, name: string) {
        let datestr = new Date().toLocaleString();

        datestr = datestr.split(' ').join('_');
        datestr = datestr.split(':').join('-');

        const logpath = path.join(filepath, 'log');

        if (!existsSync(logpath)) {
            mkdirSync(logpath);
        }

        const filename = path.join(logpath, `${datestr}_${name}.log`);

        // eslint-disable-next-line @typescript-eslint/no-var-requires
        this._log = new (require('logrc')).base(filename);
    }

    /**
     * log
     * @param methode
     * @param url
     * @param requestBody
     * @param responseBody
     * @param status
     */
    public log(methode: string, url: string, requestBody: any, responseBody: any, status?: number): void {
        this._log.log({
            methode,
            url,
            status,
            requestBody,
            responseBody
        });
    }

    /**
     * log
     * @param value
     */
    public static log(value: any): void {
        if (Logger.DEBUG_LOGGING) {
            console.log(value);
        }
    }

}