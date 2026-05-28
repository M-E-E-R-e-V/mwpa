import {DefaultReturn, StatusCodes} from 'figtree-schemas';
import {Vts} from 'vts';
import {SpeciesEntry} from 'mwpa_schemas';
import {Species as SpeciesDB} from '../../../Db/MariaDb/Entities/Species.js';
import {SpeciesRepository} from '../../../Db/MariaDb/Repositories/SpeciesRepository.js';

/**
 * Save
 */
export class Save {

    /**
     * Insert or update a species. Caller must verify admin role.
     * @param {SpeciesEntry} entry
     * @return {DefaultReturn}
     */
    public static async saveSpecies(entry?: SpeciesEntry): Promise<DefaultReturn> {
        if (Vts.isUndefined(entry)) {
            return {
                statusCode: StatusCodes.INTERNAL_ERROR,
                msg: 'Request incomplete'
            };
        }

        let species: SpeciesDB|null = null;

        if (entry.id !== 0) {
            species = await SpeciesRepository.getInstance().findOne(entry.id);
        }

        if (species === null) {
            species = new SpeciesDB();
        }

        species.name = entry.name;
        species.ott_id = entry.ottid;
        species.aphia_id = entry.aphiaid ?? 0;
        species.species_groupid = entry.species_groupid;

        await SpeciesRepository.getInstance().save(species);

        return {
            statusCode: StatusCodes.OK
        };
    }

}