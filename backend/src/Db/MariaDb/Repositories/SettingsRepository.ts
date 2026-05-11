import {DBRepositoryUnid} from 'figtree';
import {Settings} from '../Entities/Settings.js';

/**
 * Settings repository — generic key/value store backed by the
 * `settings` table. Each row is `(name, data)`; callers parse `data`
 * themselves (typically JSON).
 *
 * Kept intentionally thin: there's no schema for the data column, and
 * different consumers (movement service, depth service, …) own their
 * own JSON shape via dedicated wrapper classes.
 */
export class SettingsRepository extends DBRepositoryUnid<Settings> {

    public static REGISTER_NAME = 'settings';

    public static getInstance(): SettingsRepository {
        return super.getSingleInstance(Settings);
    }

    /**
     * Return the row for a setting name, or null when it hasn't been
     * created yet.
     */
    public async findByName(name: string): Promise<Settings | null> {
        const repository = await this._repository;
        return repository.findOne({where: {name}});
    }

    /**
     * Upsert by name. Creates a new row if none exists.
     */
    public async setByName(name: string, data: string): Promise<void> {
        const repository = await this._repository;
        const existing = await repository.findOne({where: {name}});

        if (existing) {
            existing.data = data;
            await repository.save(existing);
            return;
        }

        const row = new Settings();
        row.name = name;
        row.data = data;
        await repository.save(row);
    }

}