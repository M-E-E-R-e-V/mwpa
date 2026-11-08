import {DBRepository} from '@stefanwerfling/figtree';
import {CoastlineCache} from '../Entities/CoastlineCache.js';

/**
 * CoastlineCache repository
 */
export class CoastlineCacheRepository extends DBRepository<CoastlineCache> {

    public static REGISTER_NAME = 'coastline_cache';

    public static getInstance(): CoastlineCacheRepository {
        return super.getSingleInstance(CoastlineCache);
    }

    /**
     * Row of an area or null.
     */
    public async findByKey(areaKey: string): Promise<CoastlineCache | null> {
        const repository = await this._repository;

        return repository.findOne({
            where: {
                area_key: areaKey
            }
        });
    }

}
