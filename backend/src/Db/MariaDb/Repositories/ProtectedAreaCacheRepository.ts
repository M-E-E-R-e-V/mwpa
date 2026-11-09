import {DBRepository} from '@stefanwerfling/figtree';
import {ProtectedAreaCache} from '../Entities/ProtectedAreaCache.js';

/**
 * ProtectedAreaCache repository
 */
export class ProtectedAreaCacheRepository extends DBRepository<ProtectedAreaCache> {

    public static REGISTER_NAME = 'protected_area_cache';

    public static getInstance(): ProtectedAreaCacheRepository {
        return super.getSingleInstance(ProtectedAreaCache);
    }

    /**
     * Row of an area or null.
     */
    public async findByKey(areaKey: string): Promise<ProtectedAreaCache | null> {
        const repository = await this._repository;

        return repository.findOne({
            where: {
                area_key: areaKey
            }
        });
    }

}