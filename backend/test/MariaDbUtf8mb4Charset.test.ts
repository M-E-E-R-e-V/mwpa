import assert from 'node:assert/strict';
import {after, before, describe, it} from 'node:test';
import {DataSource, type DataSourceOptions} from 'typeorm';

/**
 * Integration test that reproduces the exact bug behind the mobile sync
 * stop on 2026-02-03: a `note` column declared `utf8mb4_unicode_ci`
 * still rejects 4-byte UTF-8 codepoints (emoji like 😭, F0 9F 98 AD)
 * if the *connection charset* is utf8mb3. figtree's default
 * `MariaDBService` doesn't set `charset`, which means the mysql driver
 * negotiates `UTF8_GENERAL_CI` (= utf8mb3) and the 4-byte codepoint
 * gets rejected at the wire level with
 * `ER_TRUNCATED_WRONG_VALUE_FOR_FIELD`.
 *
 * The fix is `MWPAMariaDBService` which forces
 * `charset: 'utf8mb4_unicode_ci'` on `DBHelper.init`. This test asserts
 * both halves of that claim against a real MariaDB:
 *
 *  1. utf8mb4 connection accepts the emoji insert and round-trips it.
 *  2. utf8 (mb3) connection rejects the same insert with
 *     ER_TRUNCATED_WRONG_VALUE_FOR_FIELD.
 *
 * The test connects to a local MariaDB on 127.0.0.1:3307 (the dev
 * compose stack, see docker-compose.yml). If that's not reachable the
 * suite skips — we don't want CI to fail when only the dev box has
 * the container.
 */

const HOST = '127.0.0.1';
const PORT = 3307;
const USER = 'root';
const PASSWORD = 'test';
const DB = 'mwpa';
const TABLE = 'test_utf8mb4_charset';
const EMOJI_NOTE = 'crying 😭 ok';

function buildOptions(charset: string): DataSourceOptions {
    return {
        type: 'mysql',
        host: HOST,
        port: PORT,
        username: USER,
        password: PASSWORD,
        database: DB,
        charset,
        // We hand-manage the table; no entities, no migrations, no sync.
        synchronize: false,
        migrationsRun: false,
        entities: [],
        logging: false
    };
}

async function tryInitialize(ds: DataSource): Promise<boolean> {
    try {
        await ds.initialize();
        return true;
    } catch {
        return false;
    }
}

describe('MariaDB utf8mb4 connection charset', () => {

    let setup: DataSource | null = null;
    let dbReachable = false;

    before(async() => {
        const probe = new DataSource(buildOptions('utf8mb4_unicode_ci'));

        if (!await tryInitialize(probe)) {
            // Connection refused / wrong port / DB down — leave dbReachable
            // false and let each test below skip itself.
            return;
        }

        dbReachable = true;
        setup = probe;

        // Mirror the production note column: text + utf8mb4_unicode_ci.
        await setup.query(
            `CREATE TABLE IF NOT EXISTS ${TABLE} (
                id INT AUTO_INCREMENT PRIMARY KEY,
                note TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`
        );
        await setup.query(`TRUNCATE TABLE ${TABLE}`);
    });

    after(async() => {
        if (setup && setup.isInitialized) {
            try {
                await setup.query(`DROP TABLE IF EXISTS ${TABLE}`);
            } catch {
                /* ignore */
            }
            await setup.destroy();
        }
    });

    it('accepts a 4-byte emoji on a utf8mb4 connection (the fix)', async(t) => {
        if (!dbReachable) {
            t.skip(`MariaDB not reachable at ${HOST}:${PORT} — skipping integration test`);
            return;
        }

        const ds = new DataSource(buildOptions('utf8mb4_unicode_ci'));
        await ds.initialize();
        try {
            await ds.query(`INSERT INTO ${TABLE} (note) VALUES (?)`, [EMOJI_NOTE]);
            const rows: {note: string}[] = await ds.query(
                `SELECT note FROM ${TABLE} ORDER BY id DESC LIMIT 1`
            );
            assert.equal(rows[0].note, EMOJI_NOTE, 'emoji must round-trip intact');
        } finally {
            await ds.destroy();
        }
    });

    it('rejects the same insert on a utf8 (mb3) connection — bug reproducer', async(t) => {
        if (!dbReachable) {
            t.skip(`MariaDB not reachable at ${HOST}:${PORT} — skipping integration test`);
            return;
        }

        const ds = new DataSource(buildOptions('utf8_general_ci'));
        await ds.initialize();
        let caught: Error & {code?: string} | null = null;
        try {
            await ds.query(`INSERT INTO ${TABLE} (note) VALUES (?)`, [EMOJI_NOTE]);
        } catch (e) {
            caught = e as Error & {code?: string};
        } finally {
            await ds.destroy();
        }

        assert.ok(caught, 'utf8mb3 connection must reject the emoji insert');
        assert.equal(
            caught?.code,
            'ER_TRUNCATED_WRONG_VALUE_FOR_FIELD',
            `expected ER_TRUNCATED_WRONG_VALUE_FOR_FIELD, got ${caught?.code}`
        );
    });

});