import {DefaultReturn, StatusCodes} from 'figtree-schemas';
import {EncounterCategorieDeleteRequest} from 'mwpa_schemas';
import {EncounterCategoriesRepository} from '../../../Db/MariaDb/Repositories/EncounterCategoriesRepository.js';

/**
 * Soft-delete one encounter category. Historical sighting reactions
 * keep their reference (the row stays in the DB), but it disappears
 * from operational pickers.
 */
export class Delete {

    public static async delete(req: EncounterCategorieDeleteRequest): Promise<DefaultReturn> {
        const repo = await EncounterCategoriesRepository.getInstance().getRepository();
        const row = await repo.findOne({where: {id: req.id}});

        if (!row) {
            return {statusCode: StatusCodes.NOT_FOUND};
        }

        row.isdeleted = true;
        await repo.save(row);

        return {statusCode: StatusCodes.OK};
    }

}