import {DefaultReturn, StatusCodes} from 'figtree-schemas';
import {ExternalTourSourceDeleteRequest} from 'mwpa_schemas';
import {OrganizationExternalTourSourceRepository} from '../../../Db/MariaDb/Repositories/OrganizationExternalTourSourceRepository.js';

/**
 * Hard-delete one source-config row. Does NOT touch its already
 * pulled external_tour rows — those stay as a historical record (and
 * remain queryable by organization_id).
 */
export class SourceDelete {

    public static async delete(req: ExternalTourSourceDeleteRequest): Promise<DefaultReturn> {
        const repo = await OrganizationExternalTourSourceRepository.getInstance().getRepository();
        const row = await repo.findOne({where: {id: req.id}});
        if (!row) {
            return {statusCode: StatusCodes.NOT_FOUND};
        }
        await repo.remove(row);
        return {statusCode: StatusCodes.OK};
    }

}