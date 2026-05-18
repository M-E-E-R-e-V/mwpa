import {DefaultReturn, StatusCodes} from 'figtree-schemas';
import {EncounterCategorieEntry} from 'mwpa_schemas';
import {EncounterCategoriesRepository} from '../../../Db/MariaDb/Repositories/EncounterCategoriesRepository.js';

/**
 * Create / update one encounter category. id=0 inserts.
 * `isdeleted` is exposed so admins can revive a previously deleted
 * row from the same form without a separate endpoint.
 */
export class Save {

    public static async save(entry: EncounterCategorieEntry): Promise<DefaultReturn> {
        const repo = await EncounterCategoriesRepository.getInstance().getRepository();

        let row = entry.id > 0 ? await repo.findOne({where: {id: entry.id}}) : null;

        if (entry.id > 0 && !row) {
            return {statusCode: StatusCodes.NOT_FOUND};
        }

        if (!row) {
            row = repo.create();
        }

        row.name = (entry.name || '').trim();
        row.description = entry.description ?? '';
        row.isdeleted = entry.isdeleted;

        if (row.name === '') {
            return {statusCode: StatusCodes.BAD_REQUEST, msg: 'Name is required.'};
        }

        await repo.save(row);
        return {statusCode: StatusCodes.OK};
    }

}