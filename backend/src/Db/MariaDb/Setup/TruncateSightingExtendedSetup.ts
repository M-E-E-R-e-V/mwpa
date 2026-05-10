import {DBHelper, DBSetupHook, Logger} from 'figtree';

/**
 * One-shot wipe of `sighting_extended` after the schema flip from the
 * legacy (sighting_id, name, data) key-value layout to structured
 * columns. The old rows have all their data in the now-dropped
 * name/data columns, so they're effectively empty after synchronize.
 * Wiping them lets DepthService and WeatherService refill the table
 * from scratch on the next cron ticks.
 *
 * Mode 'once' — figtree records the run in `db_setup_state`, so this
 * fires exactly the first time it's seen.
 */
export class TruncateSightingExtendedSetup implements DBSetupHook {

    public readonly id = 'mwpa-trunc-sighting-ext-2026-05-08';

    public readonly mode: 'once' = 'once';

    public async run(): Promise<void> {
        const ds = await DBHelper.getDataSource();
        await ds.query('TRUNCATE TABLE sighting_extended');
        Logger.getLogger().info(
            'TruncateSightingExtendedSetup: cleared sighting_extended — services will refill'
        );
    }

}