import {Connection, ConnectionOptions, createConnection} from 'typeorm';

/**
 * MariaDbHelper
 */
export class MariaDbHelper {

    private static _connection: Connection;

    /**
     * init
     * @param options
     */
    public static async init(options: ConnectionOptions): Promise<void> {
        MariaDbHelper._connection = await createConnection(options);
    }

    /**
     * getConnection
     */
    public static getConnection(): Connection {
        return this._connection;
    }

}