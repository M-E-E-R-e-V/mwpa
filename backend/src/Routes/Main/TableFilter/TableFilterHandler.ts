import {DefaultReturn, StatusCodes} from 'figtree-schemas';
import {
    TableFilterDeleteRequest,
    TableFilterEntry,
    TableFilterListRequest,
    TableFilterListResponse,
    TableFilterSaveResponse
} from 'mwpa_schemas';
import {TableFilter as TableFilterDB} from '../../../Db/MariaDb/Entities/TableFilter.js';
import {TableFilterRepository} from '../../../Db/MariaDb/Repositories/TableFilterRepository.js';
import {TableFilterValidator} from './TableFilterValidator.js';

/**
 * Private, named filter presets of frontend list tables. Every operation is
 * scoped to the session user; foreign presets behave as "not found".
 */
export class TableFilterHandler {

    /**
     * Map an entity to the API entry
     * @param {TableFilterDB} filter
     * @returns {TableFilterEntry}
     */
    protected static _toEntry(filter: TableFilterDB): TableFilterEntry {
        return {
            unid: filter.unid,
            table_name: filter.table_name,
            name: filter.name,
            settings: filter.settings ?? '{}',
            position: filter.position
        };
    }

    /**
     * List the user's presets (optionally of one table)
     * @param {number} userId
     * @param {TableFilterListRequest} req
     * @returns {TableFilterListResponse}
     */
    public static async getList(userId: number, req?: TableFilterListRequest): Promise<TableFilterListResponse> {
        if (userId <= 0) {
            return {statusCode: StatusCodes.UNAUTHORIZED};
        }

        const filters = await TableFilterRepository.getInstance().findByUser(userId, req?.table_name ?? '');

        return {
            statusCode: StatusCodes.OK,
            list: filters.map((filter) => TableFilterHandler._toEntry(filter))
        };
    }

    /**
     * Create (unid empty) or update a preset of the user
     * @param {number} userId
     * @param {TableFilterEntry} req
     * @returns {TableFilterSaveResponse}
     */
    public static async save(userId: number, req?: TableFilterEntry): Promise<TableFilterSaveResponse> {
        if (userId <= 0) {
            return {statusCode: StatusCodes.UNAUTHORIZED};
        }

        if (!req) {
            return {statusCode: StatusCodes.INTERNAL_ERROR, msg: 'Request incomplete'};
        }

        const check = TableFilterValidator.validate(req);

        if (check.error !== '') {
            return {statusCode: StatusCodes.INTERNAL_ERROR, msg: check.error};
        }

        const repo = TableFilterRepository.getInstance();
        let filter: TableFilterDB|null;

        if (req.unid === '') {
            filter = new TableFilterDB();
            filter.user_id = userId;
            filter.table_name = req.table_name;
            filter.created = new Date();

            const existing = await repo.findByUser(userId, req.table_name);
            filter.position = existing.reduce((max, entry) => Math.max(max, entry.position), 0) + 1;
        } else {
            filter = await repo.findOneByUser(userId, req.unid);

            if (filter === null) {
                return {statusCode: StatusCodes.INTERNAL_ERROR, msg: 'Filter not found'};
            }
        }

        filter.name = check.name;
        filter.settings = req.settings;

        const saved = await repo.save(filter);

        return {
            statusCode: StatusCodes.OK,
            unid: saved.unid
        };
    }

    /**
     * Delete a preset of the user
     * @param {number} userId
     * @param {TableFilterDeleteRequest} req
     * @returns {DefaultReturn}
     */
    public static async delete(userId: number, req?: TableFilterDeleteRequest): Promise<DefaultReturn> {
        if (userId <= 0) {
            return {statusCode: StatusCodes.UNAUTHORIZED};
        }

        if (!req || req.unid === '') {
            return {statusCode: StatusCodes.INTERNAL_ERROR, msg: 'Request incomplete'};
        }

        const repo = TableFilterRepository.getInstance();
        const filter = await repo.findOneByUser(userId, req.unid);

        if (filter === null) {
            return {statusCode: StatusCodes.INTERNAL_ERROR, msg: 'Filter not found'};
        }

        await repo.remove(filter.unid);

        return {statusCode: StatusCodes.OK};
    }

}