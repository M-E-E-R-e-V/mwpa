import {DBHelper, Logger, MariaDBService, ServiceError} from 'figtree';
import {SchemaConfigDbOptionsMySql, ServiceStatus} from 'figtree-schemas';
import {MWPAConfig} from '../Config/MWPAConfig.js';

/**
 * MWPAMariaDBService
 *
 * Subclass of figtree's {@link MariaDBService} that forces the
 * MariaDB connection charset to `utf8mb4_unicode_ci`. The figtree
 * default leaves charset unset, which means TypeORM/the mysql driver
 * fall back to `UTF8_GENERAL_CI` (= utf8mb3). On that connection
 * 4-byte UTF-8 codepoints (emoji, e.g. 😭 = F0 9F 98 AD) get rejected
 * with `ER_TRUNCATED_WRONG_VALUE_FOR_FIELD` even when the *column*
 * is utf8mb4 — the conversion fails on the wire before the row ever
 * reaches the column.
 *
 * That broke `/mobile/sighting/save` for every sighting whose `note`
 * contained an emoji, and the mobile sync client aborts the whole
 * sync on the first 500 — which is why tour-tracking uploads stopped
 * arriving server-side from 2026-02-03 onwards.
 *
 * The base class hard-codes the option set in `DBHelper.init`, so the
 * cleanest fix is to mirror that block here and add `charset`.
 */
export class MWPAMariaDBService extends MariaDBService {

    public override async start(): Promise<void> {
        this._inProcess = true;
        this._status = ServiceStatus.Progress;

        try {
            const tConfig = MWPAConfig.getInstance().get();

            if (tConfig === null) {
                throw new ServiceError(
                    this.constructor.name,
                    'Config is null. Check your config file exists!'
                );
            }

            if (
                tConfig.db
                && tConfig.db.mysql
                && !SchemaConfigDbOptionsMySql.validate(tConfig.db.mysql, [])
            ) {
                throw new ServiceError(
                    this.constructor.name,
                    'Configuration is invalid. Check your config file format and values.'
                );
            }

            if (tConfig.db.mysql === undefined) {
                throw new ServiceError(
                    this.constructor.name,
                    'Configuration for mysql/mariadb is not set. Check your config file format and values.'
                );
            }

            await DBHelper.init({
                type: 'mysql',
                host: tConfig.db.mysql.host,
                port: tConfig.db.mysql.port,
                username: tConfig.db.mysql.username,
                password: tConfig.db.mysql.password,
                database: tConfig.db.mysql.database,
                // Force utf8mb4 on every pooled connection — see class-level
                // docblock for the reason. `charset` is the TypeORM/mysql
                // driver knob that emits `SET NAMES <charset>` on each
                // connection handshake.
                charset: 'utf8mb4_unicode_ci',
                entities: await this._loader.loadEntities(),
                migrations: this._loader.loadMigrations(),
                migrationsRun: this._options.migrationsRun ?? true,
                synchronize: this._options.synchronize ?? true
            });

            await this._runSetupHooks();
        } catch (error) {
            this._status = ServiceStatus.Error;
            this._inProcess = false;
            this._statusMsg = `MWPAMariaDBService::start: Error while connecting to the MariaDB: ${(error as Error).message}`;
            Logger.getLogger().error(this._statusMsg);
            throw error;
        }

        this._statusMsg = '';
        this._status = ServiceStatus.Success;
        this._inProcess = false;
    }

}