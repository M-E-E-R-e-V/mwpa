import {StatusCodes} from 'figtree-schemas';
import {SightingYearsResponse} from 'mwpa_schemas';
import {SightingRepository} from '../../../Db/MariaDb/Repositories/SightingRepository.js';

/**
 * Distinct calendar years that appear in the active (non-deleted) sightings.
 * Feeds the year picker in the Excel-Report subtab.
 */
export class Years {

    /**
     * Return the year list (DESC).
     * @return {SightingYearsResponse}
     */
    public static async getYears(): Promise<SightingYearsResponse> {
        const repository = SightingRepository.getInstance();
        const years = await repository.findDistinctYears();

        return {
            statusCode: StatusCodes.OK,
            years
        };
    }

}