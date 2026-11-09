import {DBRepository, Logger} from '@stefanwerfling/figtree';
import {v4 as uuidv4} from 'uuid';
import {HistoryChange} from '../../../Application/History/HistoryDiff.js';
import {History} from '../Entities/History.js';

/**
 * Who / how a change was made.
 */
export type HistoryOrigin = {
    changerId: number;
    source: 'web' | 'mobile';
};

/**
 * History repository
 */
export class HistoryRepository extends DBRepository<History> {

    public static REGISTER_NAME = 'history';

    public static getInstance(): HistoryRepository {
        return super.getSingleInstance(History);
    }

    /**
     * Store one change event: a create / delete marker and / or the changed
     * fields, all with the same change_group. An update without changes
     * writes nothing. Never throws, so a history hiccup can't block a save.
     * @param {string} tableName
     * @param {number} rowId
     * @param {'create'|'update'|'delete'} action
     * @param {HistoryChange[]} changes
     * @param {HistoryOrigin} origin
     */
    public async record(
        tableName: string,
        rowId: number,
        action: 'create' | 'update' | 'delete',
        changes: HistoryChange[],
        origin: HistoryOrigin
    ): Promise<void> {
        if (action === 'update' && changes.length === 0) {
            return;
        }

        const group = uuidv4();
        const now = Math.floor(Date.now() / 1000);
        const make = (change: HistoryChange | null): History => {
            const row = new History();
            row.table_name = tableName;
            row.row_id = rowId;
            row.change_group = group;
            row.action = action;
            row.field = change?.field ?? '';
            row.old_value = change?.old_value ?? null;
            row.new_value = change?.new_value ?? null;
            row.changer_id = origin.changerId;
            row.change_time = now;
            row.source = origin.source;
            return row;
        };

        const rows = changes.map((change) => make(change));

        if (action !== 'update' && rows.length === 0) {
            rows.push(make(null));
        }

        try {
            const repository = await this._repository;
            await repository.save(rows);
        } catch (e) {
            Logger.getLogger().warn(`HistoryRepository::record: ${tableName} #${rowId}: ${(e as Error).message}`);
        }
    }

    /**
     * History of one row, newest first.
     * @param {string} tableName
     * @param {number} rowId
     * @return {History[]}
     */
    public async findByRow(tableName: string, rowId: number): Promise<History[]> {
        const repository = await this._repository;

        return repository.find({
            where: {
                table_name: tableName,
                row_id: rowId
            },
            order: {
                change_time: 'DESC',
                id: 'ASC'
            }
        });
    }

}