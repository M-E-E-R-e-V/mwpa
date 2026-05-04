import {StatusCodes} from 'figtree-schemas';
import {SpeciesEntry, SpeciesListResponse} from 'mwpa_schemas';
import {SpeciesRepository, SpeciesWithGroup} from '../../../Db/MariaDb/Repositories/SpeciesRepository.js';

/**
 * List
 */
export class List {

    /**
     * Build the species list — exposed as a static so other routes (Tours/Sightings)
     * can reuse it once they're ported.
     * @return {SpeciesEntry[]}
     */
    public static async getSpeciesList(): Promise<SpeciesEntry[]> {
        const rows = await SpeciesRepository.getInstance().findAllWithGroup();
        return rows.map((row: SpeciesWithGroup) => ({
            id: row.id,
            name: row.name,
            ottid: row.ott_id,
            isdeleted: row.isdeleted,
            species_groupid: row.species_groupid,
            species_group: {
                name: row.group_name,
                color: row.group_color
            }
        }));
    }

    /**
     * @return {SpeciesListResponse}
     */
    public static async getList(): Promise<SpeciesListResponse> {
        return {
            statusCode: StatusCodes.OK,
            list: await List.getSpeciesList()
        };
    }

}