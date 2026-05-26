import {StatusCodes} from 'figtree-schemas';
import {EarthquakeRecorrelateResponse} from 'mwpa_schemas';
import {EarthquakeService} from '../../../Service/EarthquakeService.js';

/**
 * Recorrelate
 *
 * Walks the entire `earthquake` table and re-runs the sighting
 * correlation against every event. Needed after a wide backfill
 * (where old earthquakes arrive in the DB but no sighting ever met
 * them during a cron tick) or after tuning the radius/window
 * constants.
 *
 * Like `Import.runImport`, we spin up a one-off service instance —
 * the cron's instance lives on the BackendApp service-manager and we
 * don't reach into it from a route.
 */
export class Recorrelate {

    private static _adhoc: EarthquakeService | null = null;

    public static async run(): Promise<EarthquakeRecorrelateResponse> {
        if (!Recorrelate._adhoc) {
            Recorrelate._adhoc = new EarthquakeService();
        }
        try {
            const result = await Recorrelate._adhoc.recorrelateAll();
            return {
                statusCode: StatusCodes.OK,
                events: result.events,
                correlations: result.correlations
            };
        } catch (err) {
            return {
                statusCode: StatusCodes.INTERNAL_ERROR,
                msg: (err as Error).message
            };
        }
    }

}