import {StatusCodes} from 'figtree-schemas';
import {EarthquakeImportRequest, EarthquakeImportResponse} from 'mwpa_schemas';
import {Vts} from 'vts';
import {EarthquakeService} from '../../../Service/EarthquakeService.js';

/**
 * Import
 *
 * Manual trigger for the EarthquakeService import flow. The cron runs
 * hourly anyway, but admins use this to backfill a date range
 * immediately after wiring a new org's tracking area.
 *
 * Important: the EarthquakeService instance the runtime uses lives on
 * the BackendApp service-manager. The route shares no state with it,
 * so we spin up a one-off service instance here whose `runImport`
 * doesn't touch the scheduler. The cron logic is single-tenant: parallel
 * imports are not a concern since runtime cron + manual button rarely
 * fire within the same minute and both end up upserting by stable id.
 */
export class Import {

    private static _adhoc: EarthquakeService | null = null;

    public static async runImport(request: EarthquakeImportRequest | undefined): Promise<EarthquakeImportResponse> {
        const req: EarthquakeImportRequest = Vts.isUndefined(request) ? {} : request;

        if (!Import._adhoc) {
            Import._adhoc = new EarthquakeService();
        }

        try {
            const result = await Import._adhoc.runImport(req.backfill_from);
            return {
                statusCode: StatusCodes.OK,
                imported: result.imported,
                updated: result.updated,
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