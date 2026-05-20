import {DBHelper, DBSetupHook, Logger} from 'figtree';

/**
 * One-shot conversion of user-entered text columns on `sighting` from the
 * legacy utf8mb3 charset to utf8mb4. The mobile app (mwpa-app v1.0.11) lets
 * users type emoji into `note`; with utf8mb3 MariaDB rejects 4-byte sequences
 * (ER_TRUNCATED_WRONG_VALUE_FOR_FIELD), which crashes the per-sighting save
 * — and because the app's SyncMwpaService rethrows on the first failure, the
 * entire backlog sync aborts before the tour-tracking phase runs, leaving
 * the affected tour without movement tracks.
 *
 * TypeORM's `synchronize: true` does not reliably detect charset changes on
 * existing columns, so we issue the ALTER explicitly here. Idempotent —
 * running it on already-utf8mb4 columns is a no-op for MariaDB.
 *
 * Mode 'once' — figtree records the run in `db_setup_state`.
 */
export class SightingNoteUtf8mb4Setup implements DBSetupHook {

    public readonly id = 'mwpa-sighting-utf8mb4-2026-05-20';

    public readonly mode: 'once' = 'once';

    public async run(): Promise<void> {
        const ds = await DBHelper.getDataSource();
        const log = Logger.getLogger();

        const textCols = [
            'location_begin',
            'location_end',
            'freq_behaviour',
            'recognizable_animals',
            'other_species',
            'other',
            'other_vehicle',
            'note',
            'deletedDescription'
        ];
        for (const col of textCols) {
            await ds.query(
                `ALTER TABLE sighting MODIFY \`${col}\` TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
            );
        }

        await ds.query(
            'ALTER TABLE sighting MODIFY `behaviours` VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT \'\''
        );
        await ds.query(
            'ALTER TABLE sighting MODIFY `beaufort_wind_n` VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT \'\''
        );

        log?.info('SightingNoteUtf8mb4Setup: sighting text columns converted to utf8mb4');
    }

}