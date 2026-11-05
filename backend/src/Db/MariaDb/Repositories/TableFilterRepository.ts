import {DBRepositoryUnid} from '@stefanwerfling/figtree';
import {TableFilter} from '../Entities/TableFilter.js';

/**
 * Repository of the private list filter presets. Every lookup is scoped
 * to the owning user.
 */
export class TableFilterRepository extends DBRepositoryUnid<TableFilter> {

    public static REGISTER_NAME = 'table_filter';

    public static getInstance(): TableFilterRepository {
        return super.getSingleInstance(TableFilter);
    }

    /**
     * All presets of a user, optionally of one table, in menu order.
     * @param {number} userId
     * @param {string} tableName '' = all tables
     * @returns {TableFilter[]}
     */
    public async findByUser(userId: number, tableName: string): Promise<TableFilter[]> {
        const repository = await this._repository;

        return repository.find({
            where: tableName === '' ? {user_id: userId} : {user_id: userId, table_name: tableName},
            order: {position: 'ASC', name: 'ASC'}
        });
    }

    /**
     * One preset of a user (foreign presets resolve to null).
     * @param {number} userId
     * @param {string} unid
     * @returns {TableFilter|null}
     */
    public async findOneByUser(userId: number, unid: string): Promise<TableFilter|null> {
        const repository = await this._repository;

        return repository.findOne({where: {user_id: userId, unid: unid}});
    }

}